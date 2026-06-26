export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { clearConn, randomUrlSafe, saveOAuthState } from '@/app/lib/platform-connect'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) return Response.json({ error: 'LinkedIn not configured' }, { status: 503 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
  const state = randomUrlSafe(16)
  await saveOAuthState(redis, state, { email, platform: 'linkedin' })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${appUrl}/api/connect/linkedin/callback`,
    scope: 'openid profile email w_member_social r_liteprofile',
    state,
  })

  return Response.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  await clearConn(redis, email, 'linkedin')
  return Response.json({ ok: true })
}
