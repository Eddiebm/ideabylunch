import Stripe from 'stripe'
import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

async function getSessionEmail(req: Request): Promise<string | null> {
  const cookie = req.headers.get('cookie') || ''
  const match = cookie.match(/i2l_session=([a-f0-9]+)/)
  if (!match) return null
  const redis = getRedis()
  if (!redis) return null
  const email = await redis.get(`session:${match[1]}`)
  return email ? String(email) : null
}

export async function GET(req: Request) {
  const email = await getSessionEmail(req)
  if (!email) {
    return Response.redirect(new URL('/login', req.url))
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'IdeaByLunch Pro — Unlimited Edits' },
          unit_amount: 1900,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    customer_email: email,
    metadata: { email, type: 'pro_upgrade' },
    success_url: `${new URL(req.url).origin}/dashboard?upgraded=1`,
    cancel_url: `${new URL(req.url).origin}/dashboard`,
  })

  return Response.redirect(session.url!)
}
