import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

function generateSession(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

  if (!token) return Response.redirect(`${appUrl}/login?error=missing_token`, 302)

  const redis = getRedis()
  if (!redis) return Response.redirect(`${appUrl}/login?error=service_unavailable`, 302)

  const email = await redis.get(`auth:token:${token}`)
  if (!email) return Response.redirect(`${appUrl}/login?error=expired`, 302)

  // Consume token (one-use)
  await redis.del(`auth:token:${token}`)

  // Create session (30 days)
  const sessionToken = generateSession()
  await redis.set(`session:${sessionToken}`, String(email), { ex: 60 * 60 * 24 * 30 })

  const res = Response.redirect(`${appUrl}/dashboard`, 302)
  res.headers.set('Set-Cookie',
    `i2l_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  )
  return res
}
