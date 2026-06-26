export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { setConn, clearConn } from '@/app/lib/platform-connect'

// POST /api/connect/bluesky — connect with app password
// DELETE /api/connect/bluesky — disconnect
export async function POST(req: NextRequest) {
  const { email, identifier, appPassword } = await req.json()

  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })
  if (!identifier || !appPassword) return Response.json({ error: 'identifier and appPassword required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  // Create session via AT Protocol
  const sessRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: appPassword }),
  })

  if (!sessRes.ok) {
    const err = await sessRes.json().catch(() => ({})) as any
    return Response.json({ error: err?.message || 'Invalid credentials' }, { status: 401 })
  }

  const { did, handle, refreshJwt } = await sessRes.json() as { did: string; handle: string; refreshJwt: string }

  await setConn(redis, email, 'bluesky', { did, handle, refreshJwt })

  return Response.json({ ok: true, handle })
}

export async function DELETE(req: NextRequest) {
  const { email } = await req.json()
  if (!email?.includes('@')) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  await clearConn(redis, email, 'bluesky')
  return Response.json({ ok: true })
}
