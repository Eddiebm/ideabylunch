import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
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
  const ttl = expiryDays * 24 * 60 * 60

  await redis.set(`dashboard:token:${token}`, JSON.stringify({ siteId, email, expiresAt }), {
    ex: ttl,
  })
  // Track active tokens per site so they can be bulk-revoked
  await redis.sadd(`dashboard:tokens:${siteId}`, token)
  // The set itself expires after the longest possible token lifetime (same TTL)
  await redis.expire(`dashboard:tokens:${siteId}`, ttl)

  return token
}

// Revoke all dashboard tokens for a site — call after email change, account takeover, etc.
export async function revokeDashboardTokens(siteId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return

  const tokens = await redis.smembers(`dashboard:tokens:${siteId}`) as string[]
  if (tokens.length) {
    await Promise.all(tokens.map(t => redis.del(`dashboard:token:${t}`)))
  }
  await redis.del(`dashboard:tokens:${siteId}`)
}
