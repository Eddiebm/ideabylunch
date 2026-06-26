export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

type QueueItem = {
  num: number
  type: string
  platform: string
  text: string
}

const DAY_MS = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const { email, idea, hooks, bluesky, threads } = await req.json() as {
    email: string
    idea: string
    hooks: QueueItem[]
    bluesky?: string[]
    threads?: string[]
  }

  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })
  if (!Array.isArray(hooks) || !hooks.length) return Response.json({ error: 'hooks required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  // Clear existing queue
  const existing = await redis.zrange(`dist:queue:${email}`, 0, -1) as string[]
  for (const id of existing) await redis.del(`dist:hook:${id}`)
  await redis.del(`dist:queue:${email}`)

  const now = Date.now()
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(12, 0, 0, 0)
  const startMs = tomorrow.getTime()

  const allItems: QueueItem[] = [...hooks]

  // Interleave Bluesky posts (one per day starting day 1)
  if (Array.isArray(bluesky)) {
    bluesky.forEach((text, i) => allItems.push({ num: i + 1, type: 'Post', platform: 'Bluesky', text }))
  }

  // Interleave Threads posts
  if (Array.isArray(threads)) {
    threads.forEach((text, i) => allItems.push({ num: i + 1, type: 'Post', platform: 'Threads', text }))
  }

  // Group by day: hooks spread over 20 days, Bluesky/Threads on first N days (alongside hooks)
  // We use the hook index for day offset, Bluesky/Threads run parallel on same days
  const hookItems = allItems.filter(i => i.platform !== 'Bluesky' && i.platform !== 'Threads')
  const bskyItems = allItems.filter(i => i.platform === 'Bluesky')
  const threadItems = allItems.filter(i => i.platform === 'Threads')

  let scheduled = 0

  const enqueue = async (item: QueueItem, dayOffset: number, suffix: string) => {
    const scheduledAt = startMs + dayOffset * DAY_MS
    const hookId = `${email.replace('@', '_at_')}:${now}:${suffix}`
    await redis.set(
      `dist:hook:${hookId}`,
      JSON.stringify({ id: hookId, email, idea, ...item, scheduledAt, status: 'pending' }),
      { ex: 60 * 60 * 24 * 60 }
    )
    await redis.zadd(`dist:queue:${email}`, { score: scheduledAt, member: hookId })
    scheduled++
  }

  for (let i = 0; i < hookItems.length; i++) {
    await enqueue(hookItems[i], i, `h${i}`)
  }
  for (let i = 0; i < bskyItems.length; i++) {
    await enqueue(bskyItems[i], i, `bs${i}`)
  }
  for (let i = 0; i < threadItems.length; i++) {
    await enqueue(threadItems[i], i, `th${i}`)
  }

  await redis.set(
    `dist:meta:${email}`,
    JSON.stringify({ idea, startsAt: startMs, total: scheduled, createdAt: now }),
    { ex: 60 * 60 * 24 * 60 }
  )
  await redis.sadd('dist:queue:emails', email)

  return Response.json({ scheduled, startsAt: startMs })
}
