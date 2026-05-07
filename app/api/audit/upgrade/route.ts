export const runtime = 'edge'
import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const PRICE_USD_CENTS = 4900 // $49

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json() as { slug: string }
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return Response.json({ error: 'invalid_slug' }, { status: 400 })
    }

    const redis = getRedis()
    const exists = redis ? await redis.get(`audit:${slug}`) : null
    if (!exists) return Response.json({ error: 'audit_not_found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_USD_CENTS,
          product_data: {
            name: 'IdeaByLunch — Ship the Rewrite',
            description: 'Ready-to-paste Next.js code patches for hero, FAQ, JSON-LD, and pricing tiers — implementation guide included.',
          },
        },
        quantity: 1,
      }],
      success_url: `${appUrl}/audit/${slug}/full?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/audit/${slug}`,
      metadata: { slug, kind: 'audit_upgrade' },
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'checkout_failed' }, { status: 500 })
  }
}
