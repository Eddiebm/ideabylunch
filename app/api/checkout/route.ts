import Stripe from 'stripe'
import { NextRequest } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const PRICES: Record<string, { amount: number; name: string; priceId?: string }> = {
  launch:  { amount: 29900,  name: 'idea2Lunch — Launch',         priceId: process.env.STRIPE_LAUNCH_PRICE_ID },
  design:  { amount: 69900,  name: 'idea2Lunch — Launch + Design', priceId: process.env.STRIPE_DESIGN_PRICE_ID },
  full:    { amount: 149900, name: 'idea2Lunch — Full Product',    priceId: process.env.STRIPE_FULL_PRICE_ID },
}

export async function POST(req: NextRequest) {
  try {
    const { plan, brief, ref } = await req.json() as { plan: string; brief: string; ref?: string }
    const planMeta = PRICES[plan]
    if (!planMeta) return Response.json({ error: 'Invalid plan' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://idea2lunch.com'

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[]
    if (planMeta.priceId) {
      lineItems = [{ price: planMeta.priceId, quantity: 1 }]
    } else {
      lineItems = [{
        price_data: {
          currency: 'usd',
          unit_amount: planMeta.amount,
          product_data: { name: planMeta.name, description: 'Your idea, built and deployed.' },
        },
        quantity: 1,
      }]
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/app?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app`,
      metadata: {
        plan,
        brief: brief.slice(0, 500),
        ...(ref ? { ref } : {}),
      },
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Checkout error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Checkout failed' }, { status: 500 })
  }
}
