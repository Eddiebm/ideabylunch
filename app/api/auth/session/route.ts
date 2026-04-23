import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const email = await redis.get(`session:${token}`)
  if (!email) return Response.json({ error: 'invalid' }, { status: 401 })

  return Response.json({ email: String(email) })
}
