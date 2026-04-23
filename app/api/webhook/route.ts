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
    const session = event.data.object as Stripe.Checkout.Session
    const redis = getRedis()
    const raw = redis ? await redis.get(`order:${session.id}`) : null
    const order: any = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null

    const customerEmail = session.customer_details?.email || order?.contact?.email
    const productName = order?.productName || session.metadata?.productName || 'Your product'
    const html = order?.selectedHtml
    const whatsapp = order?.contact?.whatsapp || session.metadata?.whatsapp

    // Legacy one-time checkout path (plan-based). Keep the old confirmation email.
    if (!html) {
      const { plan, brief } = session.metadata || {}
      const amountPaid = (session.amount_total || 0) / 100
      if (customerEmail && brief) {
        await resend.emails.send({
          from: `idea2Lunch <${process.env.RESEND_FROM || 'hello@idea2lunch.com'}>`,
          to: customerEmail,
          subject: '✦ Your product is in the kitchen — idea2Lunch',
          html: `<p>Thanks! Plan: ${plan}. Amount: $${amountPaid.toFixed(2)}. Building now.</p>`,
        })
      }
      return new Response('OK', { status: 200 })
    }

    // New pick-and-pay path: deploy the selected HTML to Vercel.
    const projectSlug = slugify(productName)
    const liveUrl = await deployToVercel(projectSlug, html)

    // Track referral conversion
    const refCode = session.metadata?.ref
    if (redis && customerEmail && refCode) {
      const referrerEmail = await redis.get(`refer:code:${refCode}`)
      if (referrerEmail && String(referrerEmail) !== customerEmail) {
        const alreadyUsed = await redis.get(`refer:used:${customerEmail}`)
        if (!alreadyUsed) {
          await redis.set(`refer:used:${customerEmail}`, refCode)
          await redis.incr(`refer:conversions:${String(referrerEmail)}`)
          // Track reseller revenue
          const amount = session.amount_total || 0
          await redis.incr(`reseller:sales:${refCode}`)
          await redis.incrby(`reseller:revenue:${refCode}`, amount)
        }
      }
    }

    if (redis) {
      if (liveUrl) redis.incr('stats:deploys')
      if (customerEmail) redis.set(`customer:${customerEmail}:order`, session.id)
      await redis.set(`order:${session.id}`, JSON.stringify({
        ...order,
        status: liveUrl ? 'deployed' : 'deploy_failed',
        projectSlug,
        liveUrl,
        deployedAt: Date.now(),
      }), { ex: 60 * 60 * 24 * 30 })
    }

    if (customerEmail && liveUrl) {
      await notifyCustomer(customerEmail, productName, liveUrl, whatsapp, resend)
    } else if (customerEmail) {
      await resend.emails.send({
        from: `idea2Lunch <${process.env.RESEND_FROM || 'hello@idea2lunch.com'}>`,
        to: customerEmail,
        subject: `Your ${productName} order — building now`,
        html: `<p>Order received. We're finalising your deploy and will send the live URL shortly.</p>`,
      }).catch(() => {})
    }
  }

  return new Response('OK', { status: 200 })
}
