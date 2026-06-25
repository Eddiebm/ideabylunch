// Node.js runtime required — generates website HTML via OpenAI and deploys to Vercel (60-120s)
export const maxDuration = 300

import { Redis } from '@upstash/redis'
import { Resend } from 'resend'
import { generateHtmlFromBrief } from '@/app/lib/generate'
import { deployToVercel, slugify } from '@/app/lib/deploy'

// ─── Redis ────────────────────────────────────────────────────────────────────

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// ─── Resend ───────────────────────────────────────────────────────────────────

function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

// ─── Signature verification ───────────────────────────────────────────────────

async function verifySignature(body: string, sig: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === sig
}

// ─── Watermark ────────────────────────────────────────────────────────────────

function watermark(html: string, reference: string, email: string, plan: string): string {
  const banner = `<!--\n  Built by IdeaByLunch — https://ideabylunch.com\n  Licensed for: ${email}\n  Order: ${reference} · Plan: ${plan}\n-->\n`
  return html.replace(/^<!DOCTYPE[^>]*>/i, m => `${banner}${m}`)
}

// ─── Grow profile helpers ─────────────────────────────────────────────────────

function extractLocation(brief: string): string {
  const m = brief.match(/\bin\s+([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\b/)
    || brief.match(/\blocated in\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\s{2})/i)
    || brief.match(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})\b/)
  return m?.[1]?.trim() || ''
}

function extractBusinessType(brief: string): string {
  const lower = brief.toLowerCase()
  if (/plumb/.test(lower)) return 'Plumbing'
  if (/restaurant|cafe|bistro|eatery|dining/.test(lower)) return 'Restaurant'
  if (/salon|barber|beauty|spa|hair/.test(lower)) return 'Beauty & Wellness'
  if (/law|attorney|legal/.test(lower)) return 'Legal Services'
  if (/real estate|property|realtor/.test(lower)) return 'Real Estate'
  if (/consult/.test(lower)) return 'Consulting'
  if (/tech|software|app|saas/.test(lower)) return 'Technology'
  if (/school|tutor|education|academy/.test(lower)) return 'Education'
  if (/doctor|clinic|health|medical/.test(lower)) return 'Healthcare'
  if (/shop|store|retail/.test(lower)) return 'Retail'
  return 'Small Business'
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('x-paystack-signature') || ''
  const secret = process.env.PAYSTACK_SECRET_KEY

  if (!secret || !(await verifySignature(body, sig, secret))) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return Response.json({ ok: true })
  }

  if (event.event !== 'charge.success') {
    return Response.json({ ok: true })
  }

  const reference: string = event.data?.reference
  if (!reference) return Response.json({ ok: true })

  const redis = getRedis()

  // ── Read order from Redis ──────────────────────────────────────────────────
  const raw = redis ? await redis.get(`order:${reference}`) : null
  const order: any = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null

  const customerEmail: string = order?.contact?.email || event.data?.customer?.email || ''
  const brief: string = order?.brief || ''
  const productName: string = order?.productName || 'Your Website'
  const plan: string = order?.plan || 'starter'
  const whatsapp: string | undefined = order?.contact?.whatsapp || undefined
  const affiliateRef: string | undefined = order?.ref || undefined

  // ── Build or use pre-generated HTML ───────────────────────────────────────
  let html: string | null = order?.selectedHtml || null
  if (!html && brief) {
    html = await generateHtmlFromBrief(brief, productName, plan)
  }

  // ── Watermark + deploy ─────────────────────────────────────────────────────
  const projectSlug = slugify(productName)
  const watermarkedHtml = html ? watermark(html, reference, customerEmail, plan) : null
  const liveUrl = watermarkedHtml ? await deployToVercel(projectSlug, watermarkedHtml) : null

  // ── Update order in Redis ──────────────────────────────────────────────────
  if (redis) {
    await redis.set(
      `order:${reference}`,
      JSON.stringify({
        ...order,
        status: liveUrl ? 'deployed' : (html ? 'deploy_failed' : 'needs_manual_build'),
        projectSlug,
        liveUrl,
        deployedAt: Date.now(),
      }),
      { ex: 60 * 60 * 24 * 30 }
    )
  }

  // ── Affiliate referral tracking ────────────────────────────────────────────
  if (redis && customerEmail && affiliateRef) {
    const referrerEmail = await redis.get(`refer:code:${affiliateRef}`)
    if (referrerEmail && String(referrerEmail) !== customerEmail) {
      const alreadyUsed = await redis.get(`refer:used:${customerEmail}`)
      if (!alreadyUsed) {
        await redis.set(`refer:used:${customerEmail}`, affiliateRef)
        await redis.incr(`refer:conversions:${String(referrerEmail)}`)
        await redis.incr(`reseller:sales:${affiliateRef}`)
        await redis.incrby(`reseller:revenue:${affiliateRef}`, order?.amount || 0)
      }
    }
  }

  // ── Auto-create Grow profile ───────────────────────────────────────────────
  if (redis && customerEmail && brief) {
    const profileKey = `grow:profile:${customerEmail.toLowerCase()}`
    const existing = await redis.get(profileKey)
    if (!existing) {
      await redis.set(
        profileKey,
        JSON.stringify({
          email: customerEmail.toLowerCase(),
          business: productName,
          businessType: extractBusinessType(brief),
          location: extractLocation(brief),
          services: '',
          customer: '',
          source: 'website_brief',
          updatedAt: Date.now(),
        }),
        { ex: 60 * 60 * 24 * 365 * 2 }
      )
      await redis.sadd('grow:delivery:subscribers', customerEmail.toLowerCase())
    }
  }

  // ── Email sequence trigger ─────────────────────────────────────────────────
  if (redis && customerEmail) {
    await redis.set(`seq:website:${customerEmail}`, Date.now(), { ex: 60 * 60 * 24 * 30 })
    await redis.sadd('seq:website:active', customerEmail)
  }

  // ── Customer email ─────────────────────────────────────────────────────────
  const resend = getResend()
  if (resend && customerEmail) {
    const from = `IdeaByLunch <${process.env.RESEND_FROM || 'hello@ideabylunch.com'}>`
    if (liveUrl) {
      await resend.emails.send({
        from,
        to: customerEmail,
        subject: `✦ ${productName} is live — ${liveUrl}`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px">
  <h1>Your site is live.</h1>
  <p>We've built and deployed <strong>${productName}</strong>.</p>
  <p><a href="${liveUrl}" style="background:#0066CC;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Visit your site →</a></p>
  <p style="color:#666;font-size:13px">Reply to this email for any changes.</p>
</div>`,
      }).catch(() => {})

      if (whatsapp) {
        console.log(`[WA-STUB] → ${whatsapp}: "Hi! ${productName} is live at ${liveUrl}. — IdeaByLunch"`)
      }
    } else {
      await resend.emails.send({
        from,
        to: customerEmail,
        subject: `✦ Your ${productName} order is confirmed — IdeaByLunch`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px">
  Your order for <strong>${productName}</strong> is confirmed. We're finalising your site and will send the live URL within 24 hours.
</div>`,
      }).catch(() => {})
    }
  }

  // ── Admin alert ────────────────────────────────────────────────────────────
  if (resend) {
    const adminEmail = process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com'
    const amountDisplay = order?.amount ? `GHS ${(order.amount / 100).toFixed(2)}` : 'unknown'
    const statusLine = liveUrl
      ? `<p style="color:#0a0">Site deployed: <a href="${liveUrl}">${liveUrl}</a></p>`
      : html
        ? `<p style="color:#c00"><strong>AUTO-DEPLOY FAILED — deliver manually.</strong></p>`
        : `<p style="color:#888">No HTML — needs manual build.</p>`

    await resend.emails.send({
      from: `IdeaByLunch <${process.env.RESEND_FROM || 'hello@ideabylunch.com'}>`,
      to: adminEmail,
      subject: `💰 ${amountDisplay} Paystack — ${plan} — ${customerEmail}`,
      html: `<div style="font-family:-apple-system,sans-serif">
  <h2>New Paystack order</h2>
  <p><strong>Amount:</strong> ${amountDisplay}</p>
  <p><strong>Plan:</strong> ${plan}</p>
  <p><strong>Customer:</strong> ${customerEmail}</p>
  <p><strong>Product:</strong> ${productName}</p>
  <p><strong>Reference:</strong> ${reference}</p>
  ${statusLine}
</div>`,
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}
