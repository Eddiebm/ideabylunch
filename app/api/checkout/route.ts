import Stripe from 'stripe'
import { NextRequest } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const PRICES: Record<string, { amount: number; name: string; priceId?: string }> = {
  starter:      { amount: 14900,  name: 'idea2Lunch — Starter Website',     priceId: process.env.STRIPE_STARTER_PRICE_ID },
  professional: { amount: 29900,  name: 'idea2Lunch — Professional Website', priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID },
  premium:      { amount: 49900,  name: 'idea2Lunch — Premium Website',      priceId: process.env.STRIPE_PREMIUM_PRICE_ID },
  full:         { amount: 149900, name: 'idea2Lunch — Full Product',          priceId: process.env.STRIPE_FULL_PRICE_ID },
  // Legacy
  launch:       { amount: 29900,  name: 'idea2Lunch — Launch',               priceId: process.env.STRIPE_LAUNCH_PRICE_ID },
  design:       { amount: 69900,  name: 'idea2Lunch — Launch + Design',       priceId: process.env.STRIPE_DESIGN_PRICE_ID },
}

const EXPRESS_FEES: Record<string, number> = {
  starter: 4900, professional: 7900, premium: 9900, full: 14900,
}

export async function POST(req: NextRequest) {
  try {
    const { plan, brief, ref, express } = await req.json() as {
      plan: string; brief: string; ref?: string; express?: boolean
    }
    const planMeta = PRICES[plan]
    if (!planMeta) return Response.json({ error: 'Invalid plan' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://idea2lunch.com'

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    // Main plan line item
    if (planMeta.priceId) {
      lineItems.push({ price: planMeta.priceId, quantity: 1 })
    } else {
      lineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: planMeta.amount,
          product_data: { name: planMeta.name, description: 'Your idea, built and deployed.' },
        },
        quantity: 1,
      })
    }

    // Express fee line item
    if (express && EXPRESS_FEES[plan]) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          unit_amount: EXPRESS_FEES[plan],
          product_data: { name: 'Express Delivery', description: 'Priority queue — faster turnaround.' },
        },
        quantity: 1,
      })
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
        express: express ? 'true' : 'false',
        ...(ref ? { ref } : {}),
      },
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Checkout error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Checkout failed' }, { status: 500 })
  }
}
