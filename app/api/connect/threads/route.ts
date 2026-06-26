export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { clearConn, randomUrlSafe, saveOAuthState } from '@/app/lib/platform-connect'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const appId = process.env.THREADS_APP_ID
  if (!appId) return Response.json({ error: 'Threads not configured' }, { status: 503 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
  const state = randomUrlSafe(16)
  await saveOAuthState(redis, state, { email, platform: 'threads' })

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${appUrl}/api/connect/threads/callback`,
    scope: 'threads_basic,threads_content_publish',
    response_type: 'code',
    state,
  })

  return Response.redirect(`https://threads.net/oauth/authorize?${params}`)
}

export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  await clearConn(redis, email, 'threads')
  return Response.json({ ok: true })
}
