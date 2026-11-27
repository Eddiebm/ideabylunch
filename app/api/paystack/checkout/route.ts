export const runtime = 'edge'
import { Redis } from '@upstash/redis'
import { PRICING } from '@/app/lib/pricing'
import { verifyOwnership, bindCheckoutSession } from '@/app/lib/site-versions'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const PROMO_CODES: Record<string, number> = {
  PRODUCTHUNT: 0.30,
}

type Body = {
  email: string
  brief?: string
  productName?: string
  selectedStyle?: string
  versionId?: string
  sessionToken?: string
  whatsapp?: string
  ref?: string
  tier?: string
  extraPages?: number
  promoCode?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body.email) {
      return Response.json({ error: 'email required' }, { status: 400 })
    }
    if (!body.versionId || !body.sessionToken) {
      return Response.json({ error: 'versionId and sessionToken are required' }, { status: 400 })
    }

    // Verify ownership before initiating payment
    const owned = await verifyOwnership({ versionId: body.versionId, sessionToken: body.sessionToken })
    if (!owned) {
      return Response.json({ error: 'Site version not found or already claimed' }, { status: 403 })
    }

    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) {
      return Response.json({ error: 'Paystack not configured' }, { status: 503 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const gh = PRICING.GHS
    const discount = PROMO_CODES[(body.promoCode || '').toUpperCase()] ?? 0
    const baseAmount = gh.oneTime + gh.monthly
    const amount = discount ? Math.round(baseAmount * (1 - discount)) : baseAmount
    const reference = `i2l_gh_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2,'0')).join('')}`

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
          versionId: body.versionId,
          whatsapp: body.whatsapp || '',
          ref: body.ref || '',
          promoCode: body.promoCode || '',
          discount: discount ? `${Math.round(discount * 100)}%` : '',
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
          brief: body.brief || '',
          selectedStyle: body.selectedStyle || '',
          versionId: body.versionId,
          plan: body.tier || 'starter',
          extraPages: body.extraPages || 0,
          contact: { email: body.email, whatsapp: body.whatsapp || '' },
          ref: body.ref || '',
          createdAt: Date.now(),
          status: 'pending',
        }),
        { ex: 60 * 60 * 24 * 14 },
      )
    }

    // Bind Paystack reference to the site version record
    await bindCheckoutSession({ versionId: body.versionId!, sessionToken: body.sessionToken!, checkoutSessionId: reference })

    return Response.json({
      url: data.data.authorization_url,
      reference,
      amount,
      currency: 'GHS',
    })
  } catch (err) {
    console.error('[paystack/checkout]', err instanceof Error ? err.message : String(err))
    return Response.json({ error: 'internal_error', message: 'Internal server error' }, { status: 500 })
  }
}
