import Stripe from 'stripe'
import { Redis } from '@upstash/redis'

export const runtime = 'edge'

const AFRICAN_COUNTRIES = new Set([
  'GH','NG','KE','ZA','TZ','UG','RW','CI','SN','ET','EG','MA','CM','TN','AO',
  'MZ','ZM','MW','BW','NA','ZW','MU','CV','GM','SL','LR','GN','BJ','TG','BF',
  'ML','NE','TD','SD','SO','DJ','MG','CD','CG','GA','GQ','BI','MR','LY','DZ',
])

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function createStripeSession(body: any, appUrl: string) {
  const { selectedStyle, calculatedPrice, productName, contact } = body
  const priceCents = Math.max(50, Math.round(calculatedPrice * 100))

  const session = await (stripe.checkout.sessions.create as any)({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: contact.email,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Domain + Hosting + Maintenance' },
        unit_amount: 9700,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    subscription_data: {
      metadata: { productName: productName.slice(0, 80), selectedStyle },
    },
    add_invoice_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `${productName} — one-time build (${selectedStyle})` },
        unit_amount: priceCents,
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/app?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/app`,
    metadata: {
      productName: productName.slice(0, 80),
      selectedStyle,
      whatsapp: contact.whatsapp || '',
      oneTimeFeeCents: String(priceCents),
    },
  })
  return { url: session.url, sessionId: session.id }
}

async function createPaystackSession(body: any, appUrl: string, currency: 'USD' | 'GHS' = 'USD') {
  const { selectedStyle, calculatedPrice, productName, contact } = body
  const paystackKey = process.env.PAYSTACK_SECRET_KEY
  if (!paystackKey) throw new Error('Paystack not configured')

  const ref = `i2l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  let amount: number
  let monthlySubscription: number
  if (currency === 'GHS') {
    // Convert USD to GHS at ~1:12 ratio, then add first month
    // $X → GHS (X * 12), $97 → GHS 1,164 → round to 1200 (20 GHS)
    amount = Math.round(calculatedPrice * 100 * 12) + 18000 // pesewas: build fee + 180 GHS (18000 pesewas)
    monthlySubscription = 18000
  } else {
    // USD: cents
    amount = Math.round(calculatedPrice * 100) + 9700 // cents: build fee + $97
    monthlySubscription = 9700
  }

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${paystackKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: contact.email,
      amount,
      currency,
      reference: ref,
      callback_url: `${appUrl}/app?paid=1&ref=${ref}`,
      channels: currency === 'GHS' ? ['card', 'mobile_money', 'bank', 'ussd', 'qr'] : undefined,
      metadata: {
        currency,
        productName: productName.slice(0, 80),
        selectedStyle,
        whatsapp: contact.whatsapp || '',
        buildFee: calculatedPrice,
        monthlySubscription,
        cancel_action: `${appUrl}/app`,
      },
    }),
  })

  const data: any = await res.json()
  if (!data.status) throw new Error(data.message || 'Paystack init failed')
  return { url: data.data.authorization_url, sessionId: ref }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      selectedStyle: string
      selectedHtml: string
      calculatedPrice: number
      priceBreakdown: Array<{ label: string; amount: number }>
      productName: string
      contact: { email: string; whatsapp?: string; country?: string }
    }

    const { selectedHtml, calculatedPrice, productName, contact } = body
    if (!selectedHtml || !contact?.email || !calculatedPrice) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const countryCode = (contact.country || '').toUpperCase()
    const isGhana = countryCode === 'GH'
    const usePaystack = AFRICAN_COUNTRIES.has(countryCode)

    const { url, sessionId } = usePaystack
      ? await createPaystackSession(body, appUrl, isGhana ? 'GHS' : 'USD')
      : await createStripeSession(body, appUrl)

    const redis = getRedis()
    if (redis) {
      const currency = usePaystack && isGhana ? 'GHS' : 'USD'
      await redis.set(`order:${sessionId}`, JSON.stringify({
        sessionId,
        processor: usePaystack ? 'paystack' : 'stripe',
        currency,
        productName,
        selectedStyle: body.selectedStyle,
        selectedHtml,
        calculatedPrice,
        priceBreakdown: body.priceBreakdown,
        contact,
        createdAt: Date.now(),
        status: 'pending',
      }), { ex: 60 * 60 * 24 * 14 })
    }

    return Response.json({ url, sessionId, processor: usePaystack ? 'paystack' : 'stripe', currency: usePaystack && isGhana ? 'GHS' : 'USD' })
  } catch (err: any) {
    console.error('order error', err)
    return Response.json({ error: err.message || 'order failed' }, { status: 500 })
  }
}
