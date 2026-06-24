import { getRedis } from '@/app/lib/redis'
import { Resend } from 'resend'

export const runtime = 'edge'

const COMMISSION_RATE = 0.30
const PAYOUT_MINIMUM = 50 // dollars

function makeCode(email: string): string {
  const hash = Array.from(email).reduce((acc, c) => ((acc << 5) - acc + c.charCodeAt(0)) | 0, 0)
  return Math.abs(hash).toString(36).slice(0, 6).toUpperCase()
}

// GET /api/refer?email=x — get referral code and real 30% earnings
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const code = makeCode(email)
  await redis.set(`refer:code:${code}`, email, { ex: 60 * 60 * 24 * 365 })

  const conversions = Number(await redis.get(`refer:conversions:${email}`)) || 0
  const revenueInCents = Number(await redis.get(`reseller:revenue:${code}`)) || 0
  const earnings = Math.round(revenueInCents * COMMISSION_RATE) / 100
  const payoutRequested = !!(await redis.get(`refer:payout_requested:${code}`))

  return Response.json({
    code,
    link: `https://ideabylunch.com/?ref=${code}`,
    conversions,
    earnings,
    payoutEligible: earnings >= PAYOUT_MINIMUM && !payoutRequested,
    payoutRequested,
  })
}

// POST /api/refer — track a referral conversion { code, newCustomerEmail }
export async function POST(req: Request) {
  const { code, newCustomerEmail } = await req.json()
  if (!code || !newCustomerEmail) return Response.json({ error: 'code and newCustomerEmail required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const referrerEmail = await redis.get(`refer:code:${code}`)
  if (!referrerEmail) return Response.json({ error: 'invalid code' }, { status: 404 })

  if (String(referrerEmail) === newCustomerEmail) return Response.json({ ok: false, reason: 'self-refer' })

  // Atomic SET NX — prevents double-spend
  const claimed = await redis.set(`refer:used:${newCustomerEmail}`, code, { nx: true, ex: 60 * 60 * 24 * 365 * 3 })
  if (!claimed) return Response.json({ ok: false, reason: 'already referred' })

  await redis.incr(`refer:conversions:${String(referrerEmail)}`)

  return Response.json({ ok: true, referrer: String(referrerEmail) })
}

// PUT /api/refer — request a cash payout { email }
export async function PUT(req: Request) {
  const { email } = await req.json()
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const code = makeCode(email)
  const revenueInCents = Number(await redis.get(`reseller:revenue:${code}`)) || 0
  const earnings = Math.round(revenueInCents * COMMISSION_RATE) / 100

  if (earnings < PAYOUT_MINIMUM) {
    return Response.json({ error: `Minimum payout is $${PAYOUT_MINIMUM}. You have $${earnings.toFixed(2)}.` }, { status: 400 })
  }

  const alreadyRequested = await redis.get(`refer:payout_requested:${code}`)
  if (alreadyRequested) return Response.json({ error: 'Payout already requested — we\'ll email you within 48 hours.' }, { status: 400 })

  await redis.set(`refer:payout_requested:${code}`, '1', { ex: 60 * 60 * 24 * 30 })

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    const resend = new Resend(resendKey)
    await resend.emails.send({
      from: `IdeaByLunch <${process.env.RESEND_FROM || 'hello@ideabylunch.com'}>`,
      to: process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com',
      subject: `💸 Affiliate payout request — $${earnings.toFixed(2)} — ${email}`,
      html: `<div style="font-family:-apple-system,sans-serif">
        <h2>Affiliate payout request</h2>
        <p><strong>Affiliate:</strong> ${email}</p>
        <p><strong>Code:</strong> ${code}</p>
        <p><strong>Conversions:</strong> ${conversions ?? '—'}</p>
        <p><strong>Revenue generated:</strong> $${(revenueInCents / 100).toFixed(2)}</p>
        <p><strong>Commission owed (30%):</strong> $${earnings.toFixed(2)}</p>
        <p>Pay via PayPal or Wise and reply to confirm.</p>
      </div>`,
    }).catch(() => {})
  }

  return Response.json({ ok: true, earnings })
}
