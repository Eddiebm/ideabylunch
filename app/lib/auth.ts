import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export function generateToken(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function createDashboardToken(
  siteId: string,
  email: string,
  expiryDays: number = 365,
): Promise<string | null> {
  const redis = getRedis()
  if (!redis) return null

  const token = generateToken()
  const expiresAt = Date.now() + expiryDays * 24 * 60 * 60 * 1000

  await redis.set(`dashboard:token:${token}`, JSON.stringify({ siteId, email, expiresAt }), {
    ex: expiryDays * 24 * 60 * 60,
  })

  return token
}
