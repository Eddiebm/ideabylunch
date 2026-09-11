// Admin: pause / resume / list seller access
// PUT  { email, action: 'pause' | 'resume' }   — toggle access
// GET  ?action=list                              — list all seller states

export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'
import { logAuditEvent } from '@/app/lib/audit-log'

async function auth(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET
  const provided = req.headers.get('x-admin-secret')
  if (!secret || !provided) return false
  const enc = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(secret)),
  ])
  const av = new Uint8Array(a), bv = new Uint8Array(b)
  let diff = av.length ^ bv.length
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i]
  return diff === 0
}

export async function PUT(req: Request) {
  if (!(await auth(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, action } = await req.json() as { email?: string; action?: string }
  if (!email || !['pause', 'resume'].includes(action ?? '')) {
    return Response.json({ error: 'email and action (pause|resume) required' }, { status: 400 })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const key = `seller:paused:${email.toLowerCase()}`
  if (action === 'pause') {
    await redis.set(key, JSON.stringify({ pausedAt: Date.now(), by: 'admin' }), { ex: 60 * 60 * 24 * 365 })
    await logAuditEvent(redis, { type: 'admin.action', ts: Date.now(), actor: 'admin', subject: email, data: { action: 'seller_paused' } })
  } else {
    await redis.del(key)
    await logAuditEvent(redis, { type: 'admin.action', ts: Date.now(), actor: 'admin', subject: email, data: { action: 'seller_resumed' } })
  }

  return Response.json({ ok: true, email, action })
}

export async function GET(req: Request) {
  if (!(await auth(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const keys = await redis.keys('seller:paused:*')
  const sellers = await Promise.all(
    keys.map(async (k) => {
      const email = k.replace('seller:paused:', '')
      const raw = await redis.get<string>(k)
      const meta = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {}
      return { email, ...meta }
    })
  )

  return Response.json({ paused: sellers })
}
