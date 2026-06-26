export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { getOAuthState, setConn } from '@/app/lib/platform-connect'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/distribute/queue?error=twitter_denied`)
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const saved = await getOAuthState<{ email: string; codeVerifier: string }>(redis, state)
  if (!saved) return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/distribute/queue?error=state_expired`)

  const clientId = process.env.TWITTER_CLIENT_ID!
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

  // Exchange code for tokens
  const creds = btoa(`${clientId}:${clientSecret}`)
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${appUrl}/api/connect/twitter/callback`,
      code_verifier: saved.codeVerifier,
      client_id: clientId,
    }).toString(),
  })

  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/distribute/queue?email=${encodeURIComponent(saved.email)}&error=twitter_token`)
  }

  const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number }

  // Get user info
  const userRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  })
  const user = await userRes.json() as { data: { id: string; username: string } }

  await setConn(redis, saved.email, 'twitter', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || '',
    expiresAt: Date.now() + (tokens.expires_in || 7200) * 1000,
    userId: user.data.id,
    username: user.data.username,
  })

  return Response.redirect(`${appUrl}/distribute/queue?email=${encodeURIComponent(saved.email)}&connected=twitter`)
}
