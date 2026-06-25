export const runtime = 'edge'
import Stripe from 'stripe'
import { getRedis } from '@/app/lib/redis'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

export async function POST(req: Request) {
  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'unavailable' }, { status: 503 })

  const { email } = await req.json() as { email: string }
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

  let customerId: string | null = null

  if (redis) {
    const stored = await redis.get(`grow:stripe_customer:${email.toLowerCase()}`)
    if (stored) customerId = String(stored)
  }

  // Fallback: look up by email in Stripe
  if (!customerId) {
    const list = await stripe.customers.list({ email, limit: 1 })
    if (list.data.length) customerId = list.data[0].id
  }

  if (!customerId) {
    return Response.json({ error: 'No subscription found for this email.' }, { status: 404 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/grow`,
  })

  return Response.json({ url: session.url })
}
