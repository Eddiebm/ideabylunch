import { Resend } from 'resend'
import { Redis } from '@upstash/redis'

export const runtime = 'nodejs'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

// ── Deduplication — skip if already contacted in last 30 days ─────────────────
async function alreadyContacted(key: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  const hit = await redis.get(`contacted:${key}`)
  return !!hit
}

async function markContacted(key: string, meta: object) {
  const redis = getRedis()
  if (!redis) return
  await redis.set(`contacted:${key}`, JSON.stringify({ ...meta, at: Date.now() }), { ex: 60 * 60 * 24 * 30 })
}

// ── SMS via Twilio (fallback when no email) ───────────────────────────────────
async function sendSMS(to: string, businessName: string, previewUrl: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_PHONE_NUMBER
  if (!sid || !token || !from) return false

  const body = `Hi! I found ${businessName} on Google Maps and built you a free website. See it here: ${previewUrl}\n\nTo go live: $299 one-time. Reply STOP to opt out. — idea2Lunch`

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    })
    return res.ok
  } catch { return false }
}

// ── Scrape mailto: + contact page emails directly from the business site ─────
async function scrapeSiteEmails(website: string): Promise<string[]> {
  const found = new Set<string>()
  const base = website.startsWith('http') ? website : `https://${website}`
  const re = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
  const urls = [base, `${base.replace(/\/$/, '')}/contact`, `${base.replace(/\/$/, '')}/contact-us`, `${base.replace(/\/$/, '')}/about`]
  for (const u of urls) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(6000), redirect: 'follow' })
      if (!res.ok) continue
      const html = await res.text()
      const matches = html.match(re) || []
      for (const m of matches) {
        const lc = m.toLowerCase()
        if (lc.endsWith('.png') || lc.endsWith('.jpg') || lc.endsWith('.jpeg') || lc.endsWith('.gif') || lc.endsWith('.svg') || lc.endsWith('.webp')) continue
        if (lc.includes('wixpress') || lc.includes('sentry') || lc.includes('example.com') || lc.includes('domain.com') || lc.includes('yoursite') || lc.includes('yourcompany') || lc.includes('@email.com') || lc.startsWith('example@') || lc.startsWith('test@') || lc.startsWith('you@') || lc.startsWith('someone@') || lc.startsWith('u003')) continue
        found.add(lc)
      }
    } catch { /* ignore */ }
  }
  return Array.from(found)
}

// ── Find business email: Hunter.io first, site scrape fallback ───────────────
async function findEmail(website: string, businessName: string): Promise<{
  email: string | null
  confidence: number
  source: string
} | null> {
  const hunterKey = process.env.HUNTER_API_KEY
  if (!hunterKey) {
    const scraped = await scrapeSiteEmails(website)
    if (scraped.length) return { email: scraped[0], confidence: 60, source: 'site-scrape' }
    return null
  }

  try {
    // Extract domain from website URL
    const domain = new URL(website.startsWith('http') ? website : `https://${website}`).hostname
      .replace('www.', '')

    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterKey}&limit=5&type=generic`,
    )

    if (!res.ok) return null
    const data = await res.json()

    // Get the highest confidence email
    const emails = data.data?.emails || []
    if (!emails.length) {
      // Try email finder with business name
      const firstName = businessName.split(' ')[0].toLowerCase()
      const finderRes = await fetch(
        `https://api.hunter.io/v2/email-finder?domain=${domain}&first_name=${firstName}&api_key=${hunterKey}`
      )
      if (finderRes.ok) {
        const finderData = await finderRes.json()
        if (finderData.data?.email) {
          return {
            email: finderData.data.email,
            confidence: finderData.data.score || 0,
            source: 'finder'
          }
        }
      }
      const scraped = await scrapeSiteEmails(website)
      if (scraped.length) return { email: scraped[0], confidence: 60, source: 'site-scrape' }
      return null
    }

    // Sort by confidence, take highest
    emails.sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))
    const best = emails[0]

    return {
      email: best.value,
      confidence: best.confidence || 0,
      source: 'domain-search'
    }
  } catch {
    return null
  }
}

// ── Build cold outreach email HTML ────────────────────────────────────────────
function buildOutreachEmail(
  businessName: string,
  ownerFirstName: string,
  previewUrl: string,
  currentWebsite: string | null,
  city: string,
  industry: string
): string {
  const greeting = ownerFirstName !== 'there' ? `Hi ${ownerFirstName},` : `Hi,`
  const shortName = businessName.split(' ').slice(0, 3).join(' ')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f7f4ee;font-family:Georgia,serif;color:#1c1510}
  .wrap{max-width:520px;margin:0 auto;padding:48px 32px}
  .logo{font-size:11px;color:#c9a84c;letter-spacing:.2em;text-transform:uppercase;font-family:monospace;margin-bottom:48px}
  h1{font-size:28px;font-weight:400;color:#1c1510;line-height:1.25;margin:0 0 24px}
  p{font-size:17px;color:#5a4a3a;line-height:1.8;margin:0 0 20px}
  .preview-box{background:#1b3a2d;border-radius:6px;padding:24px 28px;margin:32px 0}
  .preview-label{font-family:monospace;font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#c9a84c;margin-bottom:12px}
  .preview-url{font-family:monospace;font-size:13px;color:#4ade80;word-break:break-all;line-height:1.5}
  .btn{display:inline-block;background:#c9a84c;color:#1b3a2d;font-family:monospace;font-size:12px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;padding:14px 32px;border-radius:4px;text-decoration:none;margin:8px 0}
  .price{font-size:19px;color:#1c1510;font-weight:400;margin:0 0 6px}
  .price strong{color:#c9a84c}
  hr{border:none;border-top:1px solid #ddd5c4;margin:32px 0}
  .footer{font-family:monospace;font-size:10px;color:#9a8878;line-height:1.8}
  .footer a{color:#9a8878}
</style>
</head>
<body><div class="wrap">
  <div class="logo">✦ idea2Lunch</div>

  <h1>I rebuilt ${shortName}'s website.</h1>

  <p>${greeting}</p>

  <p>I came across ${businessName} while looking at ${industry} businesses in ${city}. ${currentWebsite ? `Your current site at ${currentWebsite} isn't doing you justice.` : `I noticed you don't have a website yet.`} I rebuilt it from scratch — took about an hour.</p>

  <p>Here's the live preview:</p>

  <div class="preview-box">
    <div class="preview-label">Your new website — live preview</div>
    <div class="preview-url">${previewUrl}</div>
  </div>

  <a class="btn" href="${previewUrl}">View your new site →</a>

  <p style="margin-top:32px">If you want to keep it:</p>
  <p class="price"><strong>$299</strong> — one time. No monthly fees.</p>
  <p>You get the live site, the code, and a GitHub repository. You own everything.</p>

  <p>Just reply to this email and I'll set it up under your domain within 24 hours.</p>

  <p style="margin-top:32px">— Eddie Bannerman-Menson<br/>idea2Lunch · idea2lunch.com</p>

  <hr/>
  <div class="footer">
    You're receiving this because ${businessName} came up in a search for ${industry} businesses in ${city}.<br/>
    <a href="https://idea2lunch.com/unsubscribe">Unsubscribe</a> · idea2Lunch LLC · St. Louis, MO
  </div>
</div></body></html>`
}

// ── Main outreach handler ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const {
      action,
      businessName,
      website,
      phone,
      address,
      city,
      industry,
      previewUrl,
      token,
      ownerName,
      scheduledFor,
      checkEmailOnly = false,
    } = await req.json()

    // ── Queue action: store job in Redis for the outreach script to pick up ──
    if (action === 'queue') {
      const redis = getRedis()
      if (redis && businessName && previewUrl) {
        const job = { businessName, website, phone, address, city, industry, previewUrl, token, scheduledFor, queuedAt: Date.now() }
        await redis.lpush('outreach:queue', JSON.stringify(job))
      }
      return Response.json({ status: 'queued', businessName })
    }

    if (!businessName || !previewUrl) {
      return Response.json({ error: 'businessName and previewUrl required' }, { status: 400 })
    }

    // ── Deduplication check ───────────────────────────────────────────────────
    const dedupKey = phone || businessName.toLowerCase().replace(/\s+/g, '')
    if (await alreadyContacted(dedupKey)) {
      return Response.json({ status: 'skipped', reason: 'already_contacted', businessName })
    }

    // ── Step 1: Find email ────────────────────────────────────────────────────
    let emailResult = null
    if (website) {
      emailResult = await findEmail(website, businessName)
    }

    const recipientEmail = emailResult?.email || null
    const confidence = emailResult?.confidence || 0

    // checkEmailOnly mode — just return whether we found an email, don't send
    if (checkEmailOnly) {
      if (!recipientEmail) {
        return Response.json({ status: 'no_email', message: 'Could not find email' })
      }
      if (confidence < 40) {
        return Response.json({ status: 'no_email', message: `Low confidence (${confidence}%)` })
      }
      return Response.json({ status: 'email_found', email: recipientEmail, confidence })
    }

    // ── SMS fallback when no email found ─────────────────────────────────────
    if (!recipientEmail && phone) {
      const sent = await sendSMS(phone, businessName, previewUrl)
      if (sent) {
        await markContacted(dedupKey, { businessName, phone, previewUrl, channel: 'sms' })
        return Response.json({ status: 'sent_sms', phone, businessName, previewUrl })
      }
      return Response.json({ status: 'no_channel', message: 'No email or SMS available', businessName })
    }

    if (!recipientEmail) {
      return Response.json({
        status: 'no_email',
        message: 'Could not find email for this business',
        businessName, website, previewUrl,
      })
    }

    if (confidence < 40) {
      return Response.json({
        status: 'low_confidence',
        message: `Email found but low confidence (${confidence}%) — skipping`,
        email: recipientEmail,
        confidence,
      })
    }

    // ── Step 2: Extract first name ────────────────────────────────────────────
    const ownerFirstName = ownerName
      ? ownerName.split(' ')[0]
      : 'there'

    // ── Step 3: Build and send email ──────────────────────────────────────────
    const subject = `I rebuilt ${businessName.split(' ').slice(0, 3).join(' ')}'s website`

    const html = buildOutreachEmail(
      businessName,
      ownerFirstName,
      previewUrl,
      website || null,
      city || 'your city',
      industry || 'your industry'
    )

    const sendResult = await resend.emails.send({
      from: `Eddie at idea2Lunch <hello@idea2lunch.com>`,
      to: recipientEmail,
      reply_to: 'hello@idea2lunch.com',
      subject,
      html,
    })

    // ── Step 4: Notify you internally ────────────────────────────────────────
    await resend.emails.send({
      from: `idea2Lunch Hunt <hello@idea2lunch.com>`,
      to: process.env.RESEND_FROM || 'hello@idea2lunch.com',
      subject: `🎯 Outreach sent — ${businessName}`,
      html: `<div style="font-family:monospace;padding:24px;background:#07070d;color:#f0ece4">
        <h2 style="color:#c9a84c;margin:0 0 20px">Outreach sent</h2>
        <p><strong>Business:</strong> ${businessName}</p>
        <p><strong>Email:</strong> ${recipientEmail} (${confidence}% confidence)</p>
        <p><strong>Website:</strong> ${website || 'none'}</p>
        <p><strong>Preview URL:</strong> <a href="${previewUrl}" style="color:#4ade80">${previewUrl}</a></p>
        <p><strong>City:</strong> ${city} · <strong>Industry:</strong> ${industry}</p>
        <p><strong>Phone:</strong> ${phone || 'unknown'}</p>
        <p><strong>Address:</strong> ${address || 'unknown'}</p>
      </div>`
    })

    await markContacted(dedupKey, { businessName, email: recipientEmail, previewUrl, channel: 'email' })

    return Response.json({
      status: 'sent',
      email: recipientEmail,
      confidence,
      subject,
      businessName,
      previewUrl,
      resendId: sendResult.data?.id,
    })

  } catch (err: any) {
    console.error('Outreach error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
