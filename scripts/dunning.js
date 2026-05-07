#!/usr/bin/env node
/**
 * ideaByLunch Dunning Agent
 * Polls Stripe for past-due / failed invoices, sends personalized
 * chase emails via Resend (copy drafted by OpenRouter).
 *
 * Strategy:
 *   Day 1 after fail  → friendly reminder
 *   Day 4 after fail  → clearer nudge ("your site may go offline")
 *   Day 8 after fail  → final notice (cancel subscription)
 *
 * Cron: 0 10 * * * cd /opt/ideabylunch && node --env-file=.env scripts/dunning.js >> logs/dunning.log 2>&1
 */

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY
const OPENROUTER   = process.env.OPENROUTER_API_KEY
const RESEND_KEY   = process.env.RESEND_API_KEY
const REDIS_URL    = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN  = process.env.UPSTASH_REDIS_REST_TOKEN
const ADMIN_EMAIL  = process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com'

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }

async function stripe(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`https://api.stripe.com/v1/${path}${qs ? '?' + qs : ''}`, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  })
  if (!res.ok) throw new Error(`Stripe ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function redisGet(key) {
  if (!REDIS_URL) return null
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  })
  const d = await res.json()
  return d.result
}

async function redisSet(key, value, ttlSec = 60 * 60 * 24 * 90) {
  if (!REDIS_URL) return
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSec}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  })
}

async function draftChaseEmail(customerName, amount, daysPastDue, invoiceUrl) {
  if (!OPENROUTER) return null
  const tone =
    daysPastDue <= 2 ? 'warm and understanding — treat this like a gentle nudge'
    : daysPastDue <= 5 ? 'clearer and more direct — note the site may go offline soon'
    : 'final-notice tone but still respectful — the site will be cancelled within 48 hours'
  const prompt = `Write a short email (max 120 words) chasing a failed subscription payment.
Customer: ${customerName || 'there'}
Amount: $${(amount / 100).toFixed(2)}
Days past due: ${daysPastDue}
Tone: ${tone}
Include a clear call-to-action to update their card at: ${invoiceUrl}
Sign off as "— Eddie, ideaByLunch"
Return just the email body (plain text, no subject line, no HTML).`
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENROUTER}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 350,
      }),
    })
    const d = await res.json()
    return d.choices?.[0]?.message?.content?.trim() || null
  } catch { return null }
}

async function sendEmail(to, subject, body) {
  const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1c1510;font-size:16px;line-height:1.7">
    <div style="font-family:monospace;font-size:11px;color:#c9a84c;letter-spacing:.2em;text-transform:uppercase;margin-bottom:32px">\u2726 ideaByLunch</div>
    ${body.split('\n').map(p => `<p>${p}</p>`).join('')}
  </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Eddie at ideaByLunch <hello@ideabylunch.com>',
      to, subject, html, reply_to: 'hello@ideabylunch.com',
    }),
  })
  return res.ok
}

async function cancelSubscription(subId) {
  const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  })
  return res.ok
}

async function run() {
  log('=== ideaByLunch Dunning starting ===')
  if (!STRIPE_KEY) { log('STRIPE_SECRET_KEY missing — aborting'); return }

  let chased = 0, cancelled = 0, skipped = 0

  const openInvoices = await stripe('invoices', { status: 'open', limit: '50' })
  const pastDue = (openInvoices.data || []).filter(i =>
    i.attempt_count > 0 && (i.next_payment_attempt || i.due_date))

  log(`Past-due invoices: ${pastDue.length}`)

  for (const inv of pastDue) {
    const daysPastDue = Math.floor((Date.now() / 1000 - (inv.due_date || inv.created)) / 86400)
    const key = `dun:${inv.id}:${daysPastDue < 2 ? 1 : daysPastDue < 6 ? 2 : 3}`

    if (await redisGet(key)) { skipped++; continue }

    const email = inv.customer_email
    const name = inv.customer_name
    if (!email) { skipped++; continue }

    if (daysPastDue >= 8 && inv.subscription) {
      const ok = await cancelSubscription(inv.subscription)
      if (ok) {
        await sendEmail(email, `Your ideaByLunch subscription has been cancelled`,
          `Hi ${name || 'there'},\n\nWe weren't able to process your payment after multiple attempts, so your subscription has been cancelled and the site will go offline in 24 hours.\n\nIf this is a mistake — or you want to reactivate — just reply to this email.\n\n— Eddie, ideaByLunch`)
        await sendEmail(ADMIN_EMAIL, `[ideaByLunch] Cancelled: ${name || email}`,
          `Subscription ${inv.subscription} cancelled after ${daysPastDue}d past due.\nInvoice: ${inv.hosted_invoice_url}`)
        await redisSet(key, '1')
        cancelled++
        continue
      }
    }

    const body = await draftChaseEmail(name, inv.amount_due, daysPastDue, inv.hosted_invoice_url)
      || `Hi ${name || 'there'},\n\nYour last ideaByLunch payment of $${(inv.amount_due/100).toFixed(2)} didn't go through. You can update your card here: ${inv.hosted_invoice_url}\n\n— Eddie, ideaByLunch`

    const subject = daysPastDue <= 2 ? `Quick nudge — card needs updating`
      : daysPastDue <= 5 ? `Your ideaByLunch site — payment update needed`
      : `Final notice — ideaByLunch will cancel in 48h`

    const sent = await sendEmail(email, subject, body)
    if (sent) {
      await redisSet(key, '1')
      log(`\u2713 Chased ${email} (${daysPastDue}d past due, $${(inv.amount_due/100).toFixed(2)})`)
      chased++
    } else {
      log(`\u2717 Failed to send to ${email}`)
    }
  }

  if (chased > 0 || cancelled > 0) {
    await sendEmail(ADMIN_EMAIL, `[ideaByLunch] Dunning: ${chased} chased, ${cancelled} cancelled`,
      `Chased: ${chased}\nCancelled: ${cancelled}\nSkipped (already processed today): ${skipped}`)
  }
  log(`=== Done. Chased: ${chased}, Cancelled: ${cancelled}, Skipped: ${skipped} ===`)
}

run().catch(e => { log(`Fatal: ${e.message}`); process.exit(1) })
