export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { clearConn, randomUrlSafe, pkceChallenge, saveOAuthState } from '@/app/lib/platform-connect'

// GET /api/connect/twitter?email=... → redirect to Twitter OAuth
// DELETE /api/connect/twitter?email=... → disconnect
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const clientId = process.env.TWITTER_CLIENT_ID
  if (!clientId) return Response.json({ error: 'Twitter not configured' }, { status: 503 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
  const state = randomUrlSafe(16)
  const codeVerifier = randomUrlSafe(32)
  const codeChallenge = await pkceChallenge(codeVerifier)

  await saveOAuthState(redis, state, { email, platform: 'twitter', codeVerifier })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `${appUrl}/api/connect/twitter/callback`,
    scope: 'tweet.write tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return Response.redirect(`https://twitter.com/i/oauth2/authorize?${params}`)
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  await clearConn(redis, email, 'twitter')
  return Response.json({ ok: true })
}
