export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { getOAuthState, setConn } from '@/app/lib/platform-connect'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const error = req.nextUrl.searchParams.get('error')

  if (error || !code || !state) {
    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/distribute/queue?error=linkedin_denied`)
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const saved = await getOAuthState<{ email: string }>(redis, state)
  if (!saved) return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/distribute/queue?error=state_expired`)

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/connect/linkedin/callback`,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/distribute/queue?email=${encodeURIComponent(saved.email)}&error=linkedin_token`)
  }

  const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number }

  // Get person ID
  const userRes = await fetch('https://api.linkedin.com/v2/me', {
    headers: { 'Authorization': `Bearer ${tokens.access_token}` },
  })
  const user = await userRes.json() as { id: string; localizedFirstName?: string; localizedLastName?: string }
  const name = [user.localizedFirstName, user.localizedLastName].filter(Boolean).join(' ') || user.id

  await setConn(redis, saved.email, 'linkedin', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + (tokens.expires_in || 5184000) * 1000,
    personId: user.id,
    name,
  })

  return Response.redirect(`${appUrl}/distribute/queue?email=${encodeURIComponent(saved.email)}&connected=linkedin`)
}
