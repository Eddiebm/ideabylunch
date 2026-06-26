export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { getOAuthState, setConn } from '@/app/lib/platform-connect'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/distribute/queue?error=threads_denied`)
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const saved = await getOAuthState<{ email: string }>(redis, state)
  if (!saved) return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/distribute/queue?error=state_expired`)

  const appId = process.env.THREADS_APP_ID!
  const appSecret = process.env.THREADS_APP_SECRET!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

  // Exchange code for short-lived token
  const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: `${appUrl}/api/connect/threads/callback`,
      code,
    }).toString(),
  })

  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/distribute/queue?email=${encodeURIComponent(saved.email)}&error=threads_token`)
  }

  const { access_token: shortToken, user_id: userId } = await tokenRes.json() as { access_token: string; user_id: string }

  // Exchange for long-lived token (60 days)
  const longRes = await fetch(`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`)
  const longData = await longRes.json() as { access_token?: string; expires_in?: number }
  const accessToken = longData.access_token || shortToken
  const expiresIn = longData.expires_in || 5184000 // 60 days default

  // Get username
  const userRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`)
  const user = await userRes.json() as { id: string; username?: string }

  await setConn(redis, saved.email, 'threads', {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
    userId: user.id || userId,
    username: user.username || userId,
  })

  return Response.redirect(`${appUrl}/distribute/queue?email=${encodeURIComponent(saved.email)}&connected=threads`)
}
