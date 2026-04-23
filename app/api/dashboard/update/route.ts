import { getRedis } from '@/app/lib/redis'
import { deployToVercel, applySlots } from '@/app/lib/deploy'

export const runtime = 'edge'

const SLOTS = ['heroHeadline', 'aboutText', 'servicesList', 'contactInfo', 'footerTagline'] as const
type Slot = typeof SLOTS[number]

function getWeekKey(): string {
  const now = new Date()
  const jan1 = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}

async function getSessionEmail(req: Request): Promise<string | null> {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/i2l_session=([a-f0-9]+)/)
  if (!match) return null
  const redis = getRedis()
  if (!redis) return null
  const email = await redis.get(`session:${match[1]}`)
  return email ? String(email) : null
}

export async function POST(req: Request) {
  const email = await getSessionEmail(req)
  if (!email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { slot, value } = await req.json()
  if (!slot || !SLOTS.includes(slot as Slot)) {
    return Response.json({ error: `slot must be one of: ${SLOTS.join(', ')}` }, { status: 400 })
  }
  if (typeof value !== 'string' || !value.trim()) {
    return Response.json({ error: 'value required' }, { status: 400 })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Service unavailable' }, { status: 503 })

  // Free tier: 1 edit per week
  const isPro = !!(await redis.get(`pro:${email}`))
  if (!isPro) {
    const weekKey = `edits:${email}:${getWeekKey()}`
    const edits = await redis.incr(weekKey)
    await redis.expire(weekKey, 60 * 60 * 24 * 7)
    if (edits > 1) {
      return Response.json({
        error: 'Free tier allows 1 edit per week. Upgrade to Pro for unlimited edits.',
        upgradeRequired: true,
      }, { status: 403 })
    }
  }

  // Load order
  const orderId = await redis.get(`customer:${email}:order`)
  if (!orderId) return Response.json({ error: 'No site found for this account' }, { status: 404 })

  const raw = await redis.get(`order:${String(orderId)}`)
  if (!raw) return Response.json({ error: 'Order not found' }, { status: 404 })

  const order: any = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!order.selectedHtml && !order.liveHtml) {
    return Response.json({ error: 'No HTML found for this site' }, { status: 400 })
  }

  // Update slot
  const slots = { ...(order.slots || {}), [slot]: value.trim() }
  const baseHtml = order.liveHtml || order.selectedHtml
  const updatedHtml = applySlots(baseHtml, slots)

  // Re-deploy
  const liveUrl = await deployToVercel(order.projectSlug, updatedHtml)

  // Persist
  const updated = {
    ...order,
    slots,
    liveHtml: updatedHtml,
    liveUrl: liveUrl || order.liveUrl,
    lastEditedAt: Date.now(),
    lastEditedBy: email,
  }
  await redis.set(`order:${String(orderId)}`, JSON.stringify(updated), { ex: 60 * 60 * 24 * 90 })

  return Response.json({
    ok: true,
    slot,
    liveUrl: liveUrl || order.liveUrl,
    deploying: !!liveUrl,
  })
}
