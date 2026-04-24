export const runtime = 'nodejs'
import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function verifySignature(body: string, sig: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex === sig
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('x-paystack-signature') || ''
  const secret = process.env.PAYSTACK_SECRET_KEY || ''

  const valid = await verifySignature(body, sig, secret)
  if (!valid) return new Response('Invalid signature', { status: 400 })

  const event = JSON.parse(body)
  if (event.event !== 'charge.success') return new Response('OK', { status: 200 })

  const data = event.data
  const meta = data.metadata || {}

  if (meta.type !== 'edit_unlock') return new Response('OK', { status: 200 })

  const { siteId } = meta
  const redis = getRedis()
  if (!redis) return new Response('OK', { status: 200 })

  const orderRaw = await redis.get(`order:${siteId}`)
  const order: any = orderRaw ? (typeof orderRaw === 'string' ? JSON.parse(orderRaw) : orderRaw) : null

  if (order) {
    // Reset edit count to 0 (they paid for unlimited)
    await redis.set(
      `order:${siteId}`,
      JSON.stringify({
        ...order,
        editCount: 0,
        editUnlockedAt: Date.now(),
      }),
      { ex: 60 * 60 * 24 * 365 },
    )
  }

  return new Response('OK', { status: 200 })
}
