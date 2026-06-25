export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'

function generateSession(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

  const redis = getRedis()
  if (!redis) return Response.redirect(`${appUrl}/app`, 302)

  const email = await redis.get(`access:${token}`)
  if (!email) return Response.redirect(`${appUrl}/app`, 302)

  // Create a fresh session (30 days) — link itself stays reusable
  const sessionToken = generateSession()
  await redis.set(`session:${sessionToken}`, String(email), { ex: 60 * 60 * 24 * 30 })

  const res = Response.redirect(`${appUrl}/app`, 302)
  res.headers.set(
    'Set-Cookie',
    `i2l_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
  )
  return res
}
