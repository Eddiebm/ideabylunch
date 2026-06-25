export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get('email')
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const hookIds = await redis.zrange(`dist:queue:${email}`, 0, -1) as string[]
  const meta = await redis.get(`dist:meta:${email}`)

  const hooks = await Promise.all(
    hookIds.map(async (id) => {
      const data = await redis.get(`dist:hook:${id}`)
      if (!data) return null
      return typeof data === 'string' ? JSON.parse(data) : data
    })
  )

  return Response.json({
    hooks: hooks.filter(Boolean).sort((a, b) => a.scheduledAt - b.scheduledAt),
    meta: meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : null,
  })
}
