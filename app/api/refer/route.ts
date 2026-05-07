import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

// GET /api/refer?email=x — get or create referral code for a customer
// POST /api/refer — track a referral conversion { code, newCustomerEmail }

function makeCode(email: string): string {
  const hash = Array.from(email).reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
  return Math.abs(hash).toString(36).slice(0, 6).toUpperCase()
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const code = makeCode(email)
  await redis.set(`refer:code:${code}`, email, { ex: 60 * 60 * 24 * 365 })

  const conversions = Number(await redis.get(`refer:conversions:${email}`)) || 0
  return Response.json({
    code,
    link: `https://ideabylunch.com/?ref=${code}`,
    conversions,
    credit: conversions * 20,
  })
}

export async function POST(req: Request) {
  const { code, newCustomerEmail } = await req.json()
  if (!code || !newCustomerEmail) return Response.json({ error: 'code and newCustomerEmail required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const referrerEmail = await redis.get(`refer:code:${code}`)
  if (!referrerEmail) return Response.json({ error: 'invalid code' }, { status: 404 })

  // Don't self-refer
  if (String(referrerEmail) === newCustomerEmail) return Response.json({ ok: false, reason: 'self-refer' })

  // Check not already referred
  const existing = await redis.get(`refer:used:${newCustomerEmail}`)
  if (existing) return Response.json({ ok: false, reason: 'already referred' })

  await redis.set(`refer:used:${newCustomerEmail}`, code)
  await redis.incr(`refer:conversions:${String(referrerEmail)}`)

  return Response.json({ ok: true, referrer: String(referrerEmail) })
}
