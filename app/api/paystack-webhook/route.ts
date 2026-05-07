export const runtime = 'nodejs'
import { Redis } from '@upstash/redis'
import { Resend } from 'resend'
import { createDashboardToken } from '@/app/lib/auth'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function verifySignature(body: string, sig: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === sig
}

async function deployToVercel(projectSlug: string, html: string): Promise<string | null> {
  const token = process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return null
  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: projectSlug,
      target: 'production',
      project: projectSlug,
      files: [{ file: 'index.html', data: html }],
      projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
    }),
  })
  if (!res.ok) return null
  const data: any = await res.json()
  const url = data?.url || data?.alias?.[0]
  return url ? `https://${url.replace(/^https?:\/\//, '')}` : null
}

function slugify(name: string) {
  return (name || 'site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 7)
}

async function createPaystackSubscription(
  customerCode: string,
  authCode: string,
  secret: string,
  currency: 'USD' | 'GHS' = 'USD',
) {
  const amount = currency === 'GHS' ? 18000 : 9700 // 180 GHS or $97
  const planRes = await fetch('https://api.paystack.co/plan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `IdeaByLunch — Domain + Hosting + Maintenance (${currency})`,
      amount,
      interval: 'monthly',
      currency,
    }),
  })
  const planData: any = await planRes.json()
  const planCode = planData.data?.plan_code
  if (!planCode) return

  await fetch('https://api.paystack.co/subscription', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer: customerCode, plan: planCode, authorization: authCode, start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }),
  })
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('x-paystack-signature') || ''
  const secret = process.env.PAYSTACK_SECRET_KEY || ''

  const valid = await verifySignature(body, sig, secret)
  if (!valid) return new Response('Invalid signature', { status: 400 })

  const event = JSON.parse(body)
  if (event.event !== 'charge.success') return new Response('OK', { status: 200 })

  const data = event.data
  const ref: string = data.reference
  const email: string = data.customer?.email
  const meta = data.metadata || {}
  const customerCode: string = data.customer?.customer_code
  const authCode: string = data.authorization?.authorization_code

  const redis = getRedis()
  const raw = redis ? await redis.get(`order:${ref}`) : null
  const order: any = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null

  const productName = order?.productName || meta.productName || 'Your product'
  const html = order?.selectedHtml
  const whatsapp = order?.contact?.whatsapp || meta.whatsapp

  // Set up recurring subscription starting next month — currency follows the charged tx
  const txCurrency: 'USD' | 'GHS' = data.currency === 'GHS' || meta.currency === 'GHS' ? 'GHS' : 'USD'
  if (customerCode && authCode) {
    createPaystackSubscription(customerCode, authCode, secret, txCurrency).catch(() => {})
  }

  if (!html) {
    return new Response('OK', { status: 200 })
  }

  const projectSlug = slugify(productName)
  const liveUrl = await deployToVercel(projectSlug, html)

  if (redis) {
    await redis.set(`order:${ref}`, JSON.stringify({
      ...order,
      status: liveUrl ? 'deployed' : 'deploy_failed',
      projectSlug,
      liveUrl,
      deployedAt: Date.now(),
    }), { ex: 60 * 60 * 24 * 30 })
  }

  if (email && liveUrl) {
    const token = await createDashboardToken(ref, email)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const editLink = token ? `${appUrl}/dashboard/${ref}/edit?token=${token}` : null

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: `IdeaByLunch <${process.env.RESEND_FROM || 'hello@ideabylunch.com'}>`,
      to: email,
      subject: `✦ ${productName} is live — ${liveUrl}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F2F2F7;padding:40px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
          <h1 style="font-size:28px;margin:0 0 12px">Your site is live.</h1>
          <p style="font-size:17px;color:#3C3C43;line-height:1.6">${productName} has been built and deployed.</p>
          <div style="margin:24px 0">
            <p style="margin:0 0 8px"><a href="https://${liveUrl}" style="background:#0066CC;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Visit your site</a></p>
            ${editLink ? `<p style="margin:0"><a href="${editLink}" style="background:#1D1D1F;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Edit your content</a></p>` : ''}
          </div>
          <p style="font-size:14px;color:#6E6E73">Your subscription (${txCurrency === 'GHS' ? 'GHS 180' : '$97'}/mo) starts next month. Questions? Reply to this email.</p>
        </div></body></html>`,
    }).catch(() => {})
    if (whatsapp) console.log(`[WA-STUB] → ${whatsapp}: "${productName} is live at ${liveUrl}"`)
  }

  return new Response('OK', { status: 200 })
}
