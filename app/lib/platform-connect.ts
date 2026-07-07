import type { Redis } from '@upstash/redis'

export const PLATFORMS = ['bluesky', 'twitter', 'linkedin', 'threads'] as const
export type Platform = typeof PLATFORMS[number]

export interface BlueskyConn { did: string; handle: string; refreshJwt: string }
export interface TwitterConn { accessToken: string; refreshToken: string; expiresAt: number; userId: string; username: string }
export interface LinkedInConn { accessToken: string; refreshToken?: string; expiresAt: number; personId: string; name: string }
export interface ThreadsConn { accessToken: string; expiresAt: number; userId: string; username: string }
export type PlatformConn = BlueskyConn | TwitterConn | LinkedInConn | ThreadsConn

const key = (email: string, p: Platform) => `dist:connect:${email.toLowerCase()}:${p}`

export async function setConn(redis: Redis, email: string, platform: Platform, data: PlatformConn) {
  await redis.set(key(email, platform), JSON.stringify(data), { ex: 60 * 60 * 24 * 100 })
}

export async function getConn<T = PlatformConn>(redis: Redis, email: string, platform: Platform): Promise<T | null> {
  const raw = await redis.get(key(email, platform))
  if (!raw) return null
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T
}

export async function clearConn(redis: Redis, email: string, platform: Platform) {
  await redis.del(key(email, platform))
}

export async function connStatus(redis: Redis, email: string): Promise<Record<Platform, { connected: boolean; handle?: string }>> {
  const conns = await Promise.all(
    PLATFORMS.map(p => redis.get(key(email, p)))
  )
  return Object.fromEntries(PLATFORMS.map((p, i) => {
    const raw = conns[i]
    if (!raw) return [p, { connected: false }]
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw as any
    const handle = data.handle || data.username || data.name || undefined
    return [p, { connected: true, handle }]
  })) as Record<Platform, { connected: boolean; handle?: string }>
}

// OAuth state storage (10 min TTL)
export async function saveOAuthState(redis: Redis, state: string, payload: object) {
  await redis.set(`oauth:state:${state}`, JSON.stringify(payload), { ex: 600 })
}

export async function getOAuthState<T>(redis: Redis, state: string): Promise<T | null> {
  const raw = await redis.get(`oauth:state:${state}`)
  if (!raw) return null
  await redis.del(`oauth:state:${state}`)
  return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T
}

// Random URL-safe string (edge-compatible)
export function randomUrlSafe(byteLen = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLen))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// PKCE: SHA-256 + base64url (edge-compatible Web Crypto)
export async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Platform-specific posting functions
export async function postBluesky(conn: BlueskyConn, text: string): Promise<boolean> {
  // Refresh session first (accessJwt expires in ~2h)
  const sessRes = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${conn.refreshJwt}`, 'Content-Type': 'application/json' },
  })
  if (!sessRes.ok) return false
  const { accessJwt, refreshJwt: newRefresh, did } = await sessRes.json() as { accessJwt: string; refreshJwt: string; did: string }

  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: text.slice(0, 300),
        createdAt: new Date().toISOString(),
        langs: ['en'],
      },
    }),
  })
  return postRes.ok
}

export async function postTwitter(conn: TwitterConn, text: string, clientId: string, clientSecret: string): Promise<{ ok: boolean; newTokens?: Partial<TwitterConn> }> {
  let token = conn.accessToken
  let newTokens: Partial<TwitterConn> | undefined

  // Refresh if expired (or within 5 min of expiry)
  if (Date.now() >= conn.expiresAt - 5 * 60 * 1000) {
    const creds = btoa(`${clientId}:${clientSecret}`)
    const r = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken, client_id: clientId }).toString(),
    })
    if (!r.ok) return { ok: false }
    const data = await r.json() as any
    token = data.access_token
    newTokens = { accessToken: data.access_token, refreshToken: data.refresh_token || conn.refreshToken, expiresAt: Date.now() + data.expires_in * 1000 }
  }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 280) }),
  })
  return { ok: res.ok, newTokens }
}

export async function postLinkedIn(conn: LinkedInConn, text: string, clientId: string, clientSecret: string): Promise<{ ok: boolean; newTokens?: Partial<LinkedInConn> }> {
  let token = conn.accessToken
  let newTokens: Partial<LinkedInConn> | undefined

  if (conn.refreshToken && Date.now() >= conn.expiresAt - 7 * 24 * 60 * 60 * 1000) {
    const r = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: conn.refreshToken, client_id: clientId, client_secret: clientSecret }).toString(),
    })
    if (r.ok) {
      const data = await r.json() as any
      token = data.access_token
      newTokens = { accessToken: data.access_token, refreshToken: data.refresh_token || conn.refreshToken, expiresAt: Date.now() + data.expires_in * 1000 }
    }
  }

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${conn.personId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  })
  return { ok: res.ok, newTokens }
}

export async function postThreads(conn: ThreadsConn, text: string): Promise<{ ok: boolean; newTokens?: Partial<ThreadsConn> }> {
  let token = conn.accessToken
  let newTokens: Partial<ThreadsConn> | undefined

  // Refresh long-lived token if within 7 days of expiry
  if (Date.now() >= conn.expiresAt - 7 * 24 * 60 * 60 * 1000) {
    const r = await fetch(`https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${token}`)
    if (r.ok) {
      const data = await r.json() as any
      token = data.access_token
      newTokens = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
    }
  }

  // Create container
  const create = await fetch(`https://graph.threads.net/v1.0/${conn.userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_type: 'TEXT', text: text.slice(0, 500), access_token: token }),
  })
  if (!create.ok) return { ok: false }
  const { id: creationId } = await create.json() as { id: string }

  // Brief delay then publish
  await new Promise(r => setTimeout(r, 1000))

  const publish = await fetch(`https://graph.threads.net/v1.0/${conn.userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  })
  return { ok: publish.ok, newTokens }
}
