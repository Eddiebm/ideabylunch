export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

type Hook = {
  num: number
  type: string
  platform: string
  text: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const { email, idea, hooks } = await req.json() as { email: string; idea: string; hooks: Hook[] }

  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })
  if (!Array.isArray(hooks) || !hooks.length) return Response.json({ error: 'hooks required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  // Clear any existing queue for this email
  const existing = await redis.zrange(`dist:queue:${email}`, 0, -1) as string[]
  for (const id of existing) await redis.del(`dist:hook:${id}`)
  await redis.del(`dist:queue:${email}`)

  // Start tomorrow at noon UTC
  const now = Date.now()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(12, 0, 0, 0)
  const startMs = tomorrow.getTime()

  for (let i = 0; i < hooks.length; i++) {
    const hook = hooks[i]
    const scheduledAt = startMs + i * DAY_MS
    const hookId = `${email.replace('@', '_at_')}:${now}:${i}`

    await redis.set(
      `dist:hook:${hookId}`,
      JSON.stringify({ id: hookId, email, idea, ...hook, scheduledAt, status: 'pending' }),
      { ex: 60 * 60 * 24 * 60 }
    )
    await redis.zadd(`dist:queue:${email}`, { score: scheduledAt, member: hookId })
  }

  await redis.set(
    `dist:meta:${email}`,
    JSON.stringify({ idea, startsAt: startMs, total: hooks.length, createdAt: now }),
    { ex: 60 * 60 * 24 * 60 }
  )
  await redis.sadd('dist:queue:emails', email)

  return Response.json({ scheduled: hooks.length, startsAt: startMs })
}
