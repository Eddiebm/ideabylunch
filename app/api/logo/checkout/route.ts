import Stripe from 'stripe'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const tier = searchParams.get('tier') as 'starter' | 'pro'

  if (!key || !tier) return Response.json({ error: 'key and tier required' }, { status: 400 })

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
    success_url: `${appUrl}/logo/success?key=${key}&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/logo`,
    metadata: { logoKey: key, tier },
  })

  return Response.redirect(session.url!, 303)
}
