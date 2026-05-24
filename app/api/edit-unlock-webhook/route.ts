export const runtime = 'nodejs'
import Stripe from 'stripe'
import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') || ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return new Response('Webhook secret not configured', { status: 500 })

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') return new Response('OK', { status: 200 })

  const session = event.data.object as Stripe.Checkout.Session
  const { metadata } = session
  if (metadata?.type !== 'edit_unlock') return new Response('OK', { status: 200 })

  const { siteId } = metadata
  const redis = getRedis()
  if (!redis) return new Response('OK', { status: 200 })

  const orderRaw = await redis.get(`order:${siteId}`)
  const order: any = orderRaw ? (typeof orderRaw === 'string' ? JSON.parse(orderRaw) : orderRaw) : null

  if (order) {
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
