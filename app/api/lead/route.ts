import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { email, source } = await req.json()
  if (!email?.includes('@')) return Response.json({ ok: false })

  const redis = getRedis()
  if (!redis) return Response.json({ ok: false })

  const key = `lead:${email.toLowerCase()}`
  const existing: any = await redis.get(key)
  const prev = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : {}

  await redis.set(key, JSON.stringify({
    email,
    source: source || prev.source || 'direct',
    capturedAt: prev.capturedAt || Date.now(),
    updatedAt: Date.now(),
    generates: (prev.generates || 0) + 1,
  }), { ex: 60 * 60 * 24 * 365 })

  return Response.json({ ok: true })
}
