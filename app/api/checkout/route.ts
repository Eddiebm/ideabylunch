export const runtime = 'edge'
import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'
import { STRIPE_MARKET_AMOUNTS, type CountryCode } from '@/app/lib/pricing'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function makeToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const PLAN_NAMES: Record<string, string> = {
  starter:      'IdeaByLunch — Starter Website',
  professional: 'IdeaByLunch — Professional Website',
  premium:      'IdeaByLunch — Premium Website',
  full:         'IdeaByLunch — Full Product',
}

// USD price IDs for Stripe (used when no market override)
const USD_PRICE_IDS: Record<string, string | undefined> = {
  starter:      process.env.STRIPE_STARTER_PRICE_ID,
  professional: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
  premium:      process.env.STRIPE_PREMIUM_PRICE_ID,
  full:         process.env.STRIPE_FULL_PRICE_ID,
  // Legacy
  launch:       process.env.STRIPE_LAUNCH_PRICE_ID,
  design:       process.env.STRIPE_DESIGN_PRICE_ID,
}

// Legacy USD fallback amounts
const USD_AMOUNTS: Record<string, number> = {
  starter: 14900, professional: 29900, premium: 49900, full: 149900,
  launch: 29900, design: 69900,
}

const USD_EXPRESS_FEES: Record<string, number> = {
  starter: 4900, professional: 7900, premium: 9900, full: 14900,
}

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  if (!stripe) return Response.json({ error: 'Checkout is not available in this environment.' }, { status: 503 })

  try {
    const { plan, brief, ref, express, market, designStyle } = await req.json() as {
      plan: string; brief: string; ref?: string; express?: boolean; market?: string; designStyle?: string
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    const marketRow = market ? STRIPE_MARKET_AMOUNTS[market as CountryCode] : undefined
    const isNonUSD = marketRow && marketRow.currency !== 'usd'

    if (isNonUSD) {
      // Non-USD market: always use price_data with the local currency
      const unitAmount = marketRow[plan as 'starter' | 'professional' | 'premium' | 'full'] ?? 0
      if (!unitAmount) return Response.json({ error: 'Plan not available in this market' }, { status: 400 })
      lineItems.push({
        price_data: {
          currency: marketRow.currency,
          unit_amount: unitAmount,
          product_data: { name: PLAN_NAMES[plan] ?? plan, description: 'Your idea, built and deployed.' },
        },
        quantity: 1,
      })
    } else {
      // USD market (or no market specified): use price ID if available, else price_data
      const usdAmount = marketRow?.[plan as 'starter' | 'professional' | 'premium' | 'full'] ?? USD_AMOUNTS[plan]
      if (!usdAmount) return Response.json({ error: 'Invalid plan' }, { status: 400 })
      const priceId = USD_PRICE_IDS[plan]
      if (priceId) {
        lineItems.push({ price: priceId, quantity: 1 })
      } else {
        lineItems.push({
          price_data: {
            currency: 'usd',
            unit_amount: usdAmount,
            product_data: { name: PLAN_NAMES[plan] ?? plan, description: 'Your idea, built and deployed.' },
          },
          quantity: 1,
        })
      }
      // Express fee (USD only)
      if (express && USD_EXPRESS_FEES[plan]) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            unit_amount: USD_EXPRESS_FEES[plan],
            product_data: { name: 'Express Delivery', description: 'Priority queue — faster turnaround.' },
          },
          quantity: 1,
        })
      }
    }

    if (!lineItems.length) return Response.json({ error: 'Invalid plan' }, { status: 400 })

    // Store full brief in Redis keyed by a token — Stripe metadata only holds 500 chars per field
    const briefToken = makeToken()
    const redis = getRedis()
    if (redis && brief) {
      await redis.set(`brief:${briefToken}`, brief, { ex: 60 * 60 * 24 * 7 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/app?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app`,
      metadata: {
        plan,
        briefToken,
        briefSummary: brief.slice(0, 400),
        express: express ? 'true' : 'false',
        ...(designStyle ? { designStyle } : {}),
        ...(ref ? { ref } : {}),
      },
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    console.error('Checkout error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'Checkout failed' }, { status: 500 })
  }
}
