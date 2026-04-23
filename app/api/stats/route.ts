import { Redis } from '@upstash/redis'

export const runtime = 'edge'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function GET() {
  const redis = getRedis()
  if (!redis) return Response.json({ deploys: 0 })
  const count = await redis.get('stats:deploys')
  return Response.json({ deploys: Number(count) || 0 })
}
