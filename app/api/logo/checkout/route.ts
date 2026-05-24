import Stripe from 'stripe'
import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

const VALID_KEY_RE = /^[a-z0-9:_-]{5,120}$/
const VALID_TIERS = new Set(['starter', 'pro'])

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const tier = searchParams.get('tier') as 'starter' | 'pro'

  if (!key || !tier) return Response.json({ error: 'key and tier required' }, { status: 400 })
  if (!VALID_KEY_RE.test(key)) return Response.json({ error: 'invalid key' }, { status: 400 })
  if (!VALID_TIERS.has(tier)) return Response.json({ error: 'invalid tier' }, { status: 400 })

  // Rate-limit: max 5 checkout attempts per IP per hour
  const redis = getRedis()
  if (redis) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ratKey = `rl:logo-checkout:${ip}`
    const attempts = await redis.incr(ratKey)
    if (attempts === 1) await redis.expire(ratKey, 3600)
    if (attempts > 5) return Response.json({ error: 'too_many_requests' }, { status: 429 })

    // Verify the key actually exists in Redis before creating a Stripe session
    const exists = await redis.exists(key)
    if (!exists) return Response.json({ error: 'logo not found' }, { status: 404 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'

  const prices: Record<string, number> = { starter: 9900, pro: 19900 }
  const names: Record<string, string> = {
    starter: 'Logo Starter — 3 PNG concepts',
    pro: 'Logo Pro — 3 SVG vector logos + favicon + social',
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: prices[tier] ?? 9900,
        product_data: { name: names[tier] ?? 'Logo Pack' },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/logo/success?key=${encodeURIComponent(key)}&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/logo`,
    metadata: { logoKey: key, tier },
  })

  return Response.redirect(session.url!, 303)
}
