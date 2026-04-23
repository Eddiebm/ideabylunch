import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/i2l_session=([a-f0-9]+)/)
  if (!match) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Service unavailable' }, { status: 503 })

  const email = await redis.get(`session:${match[1]}`)
  if (!email) return Response.json({ error: 'Session expired' }, { status: 401 })

  const orderId = await redis.get(`customer:${String(email)}:order`)
  if (!orderId) return Response.json({ error: 'No site found for this account' }, { status: 404 })

  const raw = await redis.get(`order:${String(orderId)}`)
  if (!raw) return Response.json({ error: 'Order not found' }, { status: 404 })

  const order = typeof raw === 'string' ? JSON.parse(raw) : raw
  const isPro = !!(await redis.get(`pro:${String(email)}`))

  return Response.json({ order, isPro, email: String(email) })
}
