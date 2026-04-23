export const runtime = 'nodejs'
import Stripe from 'stripe'
import { headers } from 'next/headers'
import { Resend } from 'resend'
import { Redis } from '@upstash/redis'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function deployToVercel(projectSlug: string, html: string): Promise<string | null> {
  const token = process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return null

  const qs = teamId ? `?teamId=${teamId}` : ''

  // Use Vercel Deployments API with inline files. This auto-creates the project if it doesn't exist.
  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: projectSlug,
      target: 'production',
      project: projectSlug,
      files: [
        { file: 'index.html', data: html },
      ],
      projectSettings: {
        framework: null,
        buildCommand: null,
        installCommand: null,
        outputDirectory: null,
        devCommand: null,
      },
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('Vercel deploy failed', res.status, text)
    return null
  }
  const data: any = await res.json()
  const url = data?.url || data?.alias?.[0]
  return url ? `https://${url.replace(/^https?:\/\//, '')}` : null
}

function slugify(name: string) {
  return (name || 'site')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7)
}

function extractProductName(brief: string): string {
  const m = brief.match(/(?:PRODUCT VISION|^)\s*([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+is/)
  return m?.[1] || 'Your Product'
}

async function generateHtmlFromBrief(brief: string, productName: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null
  const system = `You are a world-class frontend designer. Output a COMPLETE, BEAUTIFUL, PRODUCTION-READY single-page HTML document.
REQUIRED SECTIONS: fixed nav · hero · how it works (3 steps) · features · pricing · CTA · footer.
Import Google Fonts via @import in <style>. Inline ALL CSS and JS. Use tasteful gradients in place of photos.
Style: modern minimal — Inter font, generous whitespace, soft gray/black palette, subtle borders.
Start directly with <!DOCTYPE html>. No explanation before or after.`
  const user = `PRODUCT: ${productName}\nBRIEF:\n${brief.slice(0, 2500)}\n\nBuild the complete website now.`
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 6000,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    if (!res.ok) { console.error('generate html failed', res.status, await res.text()); return null }
    const data: any = await res.json()
    const html = data?.choices?.[0]?.message?.content || ''
    return html.includes('<!DOCTYPE') ? html : null
  } catch (e) {
    console.error('generate html error', e)
    return null
  }
}

async function alertAdmin(resend: Resend, data: {
  customerEmail: string; productName: string; plan: string; amount: number;
  sessionId: string; liveUrl: string | null; deployFailed: boolean;
}) {
  const adminEmail = process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com'
  const statusLine = data.liveUrl
    ? `<p style="color:#0a0">Site deployed: <a href="${data.liveUrl}">${data.liveUrl}</a></p>`
    : data.deployFailed
      ? `<p style="color:#c00"><strong>AUTO-DEPLOY FAILED — deliver manually.</strong></p>`
      : ''
  try {
    await resend.emails.send({
      from: `idea2Lunch <${process.env.RESEND_FROM || 'hello@idea2lunch.com'}>`,
      to: adminEmail,
      subject: `💰 $${data.amount} — ${data.plan} — ${data.customerEmail}`,
      html: `<div style="font-family:-apple-system,sans-serif">
        <h2>New paid order</h2>
        <p><strong>Amount:</strong> $${data.amount}</p>
        <p><strong>Plan:</strong> ${data.plan}</p>
        <p><strong>Customer:</strong> ${data.customerEmail}</p>
        <p><strong>Product:</strong> ${data.productName}</p>
        <p><strong>Stripe session:</strong> ${data.sessionId}</p>
        ${statusLine}
      </div>`,
    })
  } catch (e) {
    console.error('admin alert failed', e)
  }
}

async function notifyCustomer(email: string, productName: string, liveUrl: string, whatsapp: string | undefined, resend: Resend) {
  try {
    await resend.emails.send({
      from: `idea2Lunch <${process.env.RESEND_FROM || 'hello@idea2lunch.com'}>`,
      to: email,
      subject: `✦ ${productName} is live — ${liveUrl}`,
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F2F2F7;padding:40px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
          <h1 style="font-size:28px;margin:0 0 12px">Your site is live.</h1>
          <p style="font-size:17px;color:#3C3C43;line-height:1.6">${productName} has been built and deployed.</p>
          <p><a href="${liveUrl}" style="background:#0066CC;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">Visit ${liveUrl}</a></p>
          <p style="font-size:14px;color:#6E6E73">A custom domain will be connected within 24 hours. Reply with any tweaks you want.</p>
        </div></body></html>`,
    })
  } catch (e) {
    console.error('email notify failed', e)
  }

  // WhatsApp stub
  if (whatsapp) {
    console.log(`[WA-STUB] → ${whatsapp}: "Hi! ${productName} is live at ${liveUrl}. — idea2Lunch"`)
  }
}

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object as Stripe.Checkout.Session
      const redis = getRedis()
      const raw = redis ? await redis.get(`order:${session.id}`) : null
      const order: any = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null

      const customerEmail = session.customer_details?.email || order?.contact?.email
      const brief = session.metadata?.brief || order?.brief || ''
      const plan = session.metadata?.plan || order?.plan || 'starter'
      const amountPaid = (session.amount_total || 0) / 100
      const productName = order?.productName || session.metadata?.productName || extractProductName(brief)
      const whatsapp = order?.contact?.whatsapp || session.metadata?.whatsapp

      // Get or generate HTML
      let html: string | null = order?.selectedHtml || null
      if (!html && brief) html = await generateHtmlFromBrief(brief, productName)

      // Deploy if we have HTML
      const projectSlug = slugify(productName)
      const liveUrl = html ? await deployToVercel(projectSlug, html) : null

      // Track referral conversion
      const refCode = session.metadata?.ref
      if (redis && customerEmail && refCode) {
        const referrerEmail = await redis.get(`refer:code:${refCode}`)
        if (referrerEmail && String(referrerEmail) !== customerEmail) {
          const alreadyUsed = await redis.get(`refer:used:${customerEmail}`)
          if (!alreadyUsed) {
            await redis.set(`refer:used:${customerEmail}`, refCode)
            await redis.incr(`refer:conversions:${String(referrerEmail)}`)
            const amount = session.amount_total || 0
            await redis.incr(`reseller:sales:${refCode}`)
            await redis.incrby(`reseller:revenue:${refCode}`, amount)
          }
        }
      }

      // Always record the order
      if (redis) {
        if (liveUrl) redis.incr('stats:deploys')
        if (customerEmail) redis.set(`customer:${customerEmail}:order`, session.id)
        await redis.set(`order:${session.id}`, JSON.stringify({
          ...order,
          sessionId: session.id,
          customerEmail,
          productName,
          plan,
          amount: amountPaid,
          brief,
          status: liveUrl ? 'deployed' : (html ? 'deploy_failed' : 'needs_manual_build'),
          projectSlug,
          liveUrl,
          createdAt: Date.now(),
          deployedAt: liveUrl ? Date.now() : null,
        }), { ex: 60 * 60 * 24 * 90 })
      }

      // Notify customer
      if (customerEmail && liveUrl) {
        await notifyCustomer(customerEmail, productName, liveUrl, whatsapp, resend)
      } else if (customerEmail) {
        await resend.emails.send({
          from: `idea2Lunch <${process.env.RESEND_FROM || 'hello@idea2lunch.com'}>`,
          to: customerEmail,
          subject: `✦ Your ${productName} order is in — idea2Lunch`,
          html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px">
            <h1 style="font-size:24px">Order received.</h1>
            <p>Thanks — we've got your ${plan} order for <strong>${productName}</strong> ($${amountPaid.toFixed(2)}).</p>
            <p>We're finalising your site and will email the live URL within 24 hours.</p>
            <p style="color:#666;font-size:13px">Reply to this email with any tweaks.</p>
          </div>`,
        }).catch(() => {})
      }

      // Admin alert — always fires so you never miss a sale
      if (customerEmail) {
        await alertAdmin(resend, {
          customerEmail, productName, plan, amount: amountPaid,
          sessionId: session.id,
          liveUrl,
          deployFailed: !!html && !liveUrl,
        })
      }
    } catch (e) {
      console.error('webhook handler error', e)
      // Always email admin on failure so money never lands silently
      try {
        await resend.emails.send({
          from: `idea2Lunch <${process.env.RESEND_FROM || 'hello@idea2lunch.com'}>`,
          to: process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com',
          subject: `⚠️ Webhook handler threw — check Stripe event ${event.id}`,
          html: `<p>Handler crashed. Stripe event <code>${event.id}</code> returned 200 but processing failed.</p><pre>${String(e).slice(0, 2000)}</pre>`,
        })
      } catch {}
    }
  }

  return new Response('OK', { status: 200 })
}
