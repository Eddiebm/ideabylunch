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
  if (!stripe) return Response.json({ error: 'Checkout unavailable' }, { status: 503 })

  const { email, ref } = await req.json() as { email?: string; ref?: string }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
  const priceId = process.env.STRIPE_GROW_PRICE_ID

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = priceId
    ? { price: priceId, quantity: 1 }
    : {
        price_data: {
          currency: 'usd',
          unit_amount: 4900,
          recurring: { interval: 'month' },
          product_data: {
            name: 'IdeaByLunch Grow',
            description: 'Monthly marketing kit + all 7 tools, unlimited generations, delivered to your inbox.',
          },
        },
        quantity: 1,
      }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [lineItem],
    allow_promotion_codes: true,
    customer_email: email || undefined,
    success_url: `${appUrl}/grow?subscribed=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/grow`,
    metadata: {
      source: 'grow',
      ...(ref ? { ref } : {}),
    },
  })

  return Response.json({ url: session.url })
}
