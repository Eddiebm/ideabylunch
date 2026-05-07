export const runtime = 'edge'
import { Redis } from '@upstash/redis'
import { PRICING } from '@/app/lib/pricing'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

type Body = {
  email: string
  productName?: string
  selectedStyle?: string
  selectedHtml?: string
  whatsapp?: string
  ref?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body.email) {
      return Response.json({ error: 'email required' }, { status: 400 })
    }

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      return Response.json({ error: 'Paystack not configured' }, { status: 503 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const gh = PRICING.GHS
    // Charge one-time build fee + first month up-front in pesewas.
    const amount = gh.oneTime + gh.monthly
    const reference = `i2l_gh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    const init = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        amount,
        currency: 'GHS',
        reference,
        callback_url: `${appUrl}/app?paid=1&ref=${reference}`,
        channels: ['card', 'mobile_money', 'bank', 'ussd', 'qr', 'bank_transfer'],
        metadata: {
          currency: 'GHS',
          productName: (body.productName || 'IdeaByLunch').slice(0, 80),
          selectedStyle: body.selectedStyle || '',
          whatsapp: body.whatsapp || '',
          ref: body.ref || '',
          oneTimePesewas: gh.oneTime,
          monthlyPesewas: gh.monthly,
          cancel_action: `${appUrl}/app`,
        },
      }),
    })

    const data = (await init.json()) as {
      status: boolean
      message?: string
      data?: { authorization_url: string; access_code: string; reference: string }
    }
    if (!data.status || !data.data) {
      return Response.json({ error: data.message || 'Paystack init failed' }, { status: 502 })
    }

    const redis = getRedis()
    if (redis) {
      await redis.set(
        `order:${reference}`,
        JSON.stringify({
          sessionId: reference,
          processor: 'paystack',
          currency: 'GHS',
          amount,
          productName: body.productName || '',
          selectedStyle: body.selectedStyle || '',
          selectedHtml: body.selectedHtml || '',
          contact: { email: body.email, whatsapp: body.whatsapp || '' },
          createdAt: Date.now(),
          status: 'pending',
        }),
        { ex: 60 * 60 * 24 * 14 },
      )
    }

    return Response.json({
      url: data.data.authorization_url,
      reference,
      amount,
      currency: 'GHS',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'checkout failed'
    return Response.json({ error: msg }, { status: 500 })
  }
}
