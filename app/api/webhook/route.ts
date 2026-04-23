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

function cleanToken(raw: string | undefined): string | null {
  if (!raw) return null
  return raw.trim().replace(/\\n$/, '').replace(/^["']|["']$/g, '')
}

async function deployToVercel(projectSlug: string, html: string): Promise<string | null> {
  const token = cleanToken(process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN)
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return null

  const qs = teamId ? `?teamId=${teamId}` : ''

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
      files: [{ file: 'index.html', data: html }],
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
    console.error('Vercel deploy failed', res.status, await res.text())
    return null
  }
  const data: any = await res.json()
  const url = data?.url || data?.alias?.[0]

  // Make the project publicly accessible (disable SSO + password protection)
  await fetch(`https://api.vercel.com/v10/projects/${projectSlug}${qs}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssoProtection: null, passwordProtection: null }),
  }).catch(e => console.error('disable protection failed', e))

  return url ? `https://${url.replace(/^https?:\/\//, '')}` : null
}

function watermark(html: string, meta: { sessionId: string; customerEmail: string; plan: string }): string {
  const banner = `<!--
  Built by idea2Lunch — https://idea2lunch.com
  Licensed for exclusive use by: ${meta.customerEmail}
  Order: ${meta.sessionId} · Plan: ${meta.plan} · Built: ${new Date().toISOString()}
  Redistribution, resale, or use for other businesses is prohibited.
  Questions? hello@idea2lunch.com
-->
`
  return html.replace(/^<!DOCTYPE[^>]*>/i, m => `${banner}${m}`)
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

async function fetchPhotos(query: string, count: number): Promise<string[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&content_filter=high`
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } })
    if (!res.ok) return []
    const data: any = await res.json()
    return (data.results || []).map((p: any) => p.urls.regular as string)
  } catch { return [] }
}

function extractPhotoQuery(brief: string, productName: string): string {
  const lower = brief.toLowerCase()
  if (/restaurant|food|cafe|kitchen|menu|dish/.test(lower)) return 'restaurant food'
  if (/vitamin|peptide|supplement|health|medical|pharma/.test(lower)) return 'wellness supplements'
  if (/plumb|repair|contractor|hvac|handyman/.test(lower)) return 'professional service worker'
  if (/real estate|property|realtor|homes/.test(lower)) return 'modern architecture home'
  if (/fashion|apparel|clothing|boutique/.test(lower)) return 'fashion editorial'
  if (/fitness|gym|yoga|personal trainer/.test(lower)) return 'fitness athlete'
  if (/law|legal|attorney/.test(lower)) return 'law office professional'
  if (/salon|beauty|spa|hair|barber/.test(lower)) return 'luxury spa beauty'
  if (/tech|software|saas|platform|app/.test(lower)) return 'modern office technology'
  if (/consult|agency|marketing|branding/.test(lower)) return 'business strategy meeting'
  return `${productName} lifestyle`
}

type Tier = 'starter' | 'professional' | 'premium'

const TIER_CONFIG: Record<Tier, { model: string; photos: number; maxTokens: number; directive: string }> = {
  starter: {
    model: 'google/gemini-2.5-flash',
    photos: 4,
    maxTokens: 8000,
    directive: `Aim for a site that looks like it cost $100,000 — Stripe-level polish. Modern premium SaaS aesthetic.
- Inter or Geist font, tight typographic hierarchy (88px hero → 48px section → 20px body)
- Generous whitespace, 1440px max-width, precise 8pt grid
- Photos MUST be used as full-bleed hero background (with 0.4 dark overlay + white text) and in a 3-column feature gallery
- Subtle gradients, soft shadows (0 10px 40px rgba(0,0,0,0.08)), rounded-xl cards
- Monochrome palette with ONE vivid accent color derived from the product
- Micro-interactions: hover lifts, fade-in on scroll (IntersectionObserver), smooth button transitions`,
  },
  professional: {
    model: 'google/gemini-2.5-pro',
    photos: 6,
    maxTokens: 12000,
    directive: `Aim for a site that looks like it cost $500,000 — Apple meets Linear. Top 1% of landing pages.
- Custom-feeling typography (Fraunces + Inter pairing, or Playfair + Söhne)
- Asymmetric editorial layouts, magazine-style spreads, layered imagery
- 6 photos used across: hero (parallax), 3-col feature grid, testimonial portraits, footer CTA backdrop
- Signature color story: rich primary + analogous secondary + 1 unexpected accent
- Advanced CSS: scroll-triggered animations, subtle parallax, blurred background orbs, gradient text
- Sections: sticky nav w/ backdrop-filter, video-worthy hero, social proof bar (fake press logos as SVG), feature storytelling (alternating image-left/right), stats/metrics band, 3-tier pricing, testimonial carousel, FAQ accordion, multi-column footer`,
  },
  premium: {
    model: 'anthropic/claude-sonnet-4.5',
    photos: 8,
    maxTokens: 16000,
    directive: `DESIGN GOD TIER — a site that looks like it cost $2,000,000. Awwwards-winner. Apple.com / Rauno / Vercel / Linear quality.
- Custom type pairing with variable fonts, 120px+ display heading, optical size adjustments, display tracking tuned by hand
- Full-bleed cinematic hero with layered photo + gradient mesh + animated noise texture
- 8 photos orchestrated: hero parallax, bento feature grid (varied sizes), portrait testimonials, lifestyle/product crops, footer epic scene
- Signature design system: a distinct color story that feels like a brand (reference Stripe/Linear/Vercel as inspiration), custom SVG icons
- Advanced motion: scroll-triggered reveals, magnetic buttons, cursor trail, smooth-scroll, bento cards that reorganize on scroll, number counters
- Rich sections: kinetic hero, "as seen in" press bar with realistic SVG logos, 3-act storytelling features with oversized imagery, interactive pricing compare table, case study / metric band with animated counters, testimonial quotes in editorial typography, founder letter with signature, FAQ with smooth accordion, EPIC multi-column footer with newsletter + social + sitemap
- Details matter: hairline dividers, small-caps labels, pull quotes, drop caps in at least one section, pull-through type, hand-crafted micro-copy`,
  },
}

async function generateHtmlFromBrief(brief: string, productName: string, plan: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  const tier: Tier = (['starter', 'professional', 'premium'].includes(plan) ? plan : 'starter') as Tier
  const cfg = TIER_CONFIG[tier]

  const photoQuery = extractPhotoQuery(brief, productName)
  const photos = await fetchPhotos(photoQuery, cfg.photos)
  const photoBlock = photos.length
    ? photos.map((u, i) => `  photo_${i + 1}: ${u}`).join('\n')
    : '  (no photos available — use rich gradient meshes and SVG illustrations instead)'

  const system = `You are a world-class frontend designer and art director in the top 0.1% of your craft.
Output a COMPLETE, PRODUCTION-READY single-page HTML document.

${cfg.directive}

HARD REQUIREMENTS:
- Start directly with <!DOCTYPE html>. No markdown fences, no preamble, no explanation.
- Import Google Fonts via @import in <style>. Inline ALL CSS and JS.
- Use the provided photo URLs as <img src="..."> and CSS background-image exactly — do NOT invent placeholder URLs.
- Every image must have object-fit: cover; and proper alt text.
- Build a REAL navigation bar with logo + 4 links + primary CTA button.
- Build a REAL footer with brand, 3-4 link columns (Product/Company/Resources/Legal), social icons, and copyright.
- Write compelling, specific copy — no lorem ipsum, no "Lorem" placeholder text, no generic "Feature one / Feature two". Every headline, subhead, and button label must speak to the product's actual value.
- Use the product name consistently throughout.
- Make it feel ALIVE: subtle animations, hover states, scroll behaviors.`

  const user = `PRODUCT NAME: ${productName}
TIER: ${tier.toUpperCase()}

BRIEF (use this as ground truth for copy, features, audience, pricing):
${brief.slice(0, 3500)}

AVAILABLE PHOTOS (use EVERY ONE in the layout — do not skip any):
${photoBlock}

Build the complete website now. Be bold. Be specific. Make the client's jaw drop.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        temperature: 0.85,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    if (!res.ok) { console.error('generate html failed', res.status, await res.text()); return null }
    const data: any = await res.json()
    let html = data?.choices?.[0]?.message?.content || ''
    // Strip markdown fences if the model wrapped it
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim()
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
      const briefToken = session.metadata?.briefToken
      let brief = order?.brief || session.metadata?.brief || session.metadata?.briefSummary || ''
      if (briefToken && redis) {
        const fullBrief = await redis.get(`brief:${briefToken}`)
        if (fullBrief) brief = String(fullBrief)
      }
      const plan = session.metadata?.plan || order?.plan || 'starter'
      const amountPaid = (session.amount_total || 0) / 100
      const productName = order?.productName || session.metadata?.productName || extractProductName(brief)
      const whatsapp = order?.contact?.whatsapp || session.metadata?.whatsapp

      // Get or generate HTML
      let html: string | null = order?.selectedHtml || null
      if (!html && brief) html = await generateHtmlFromBrief(brief, productName, plan)

      // Watermark + deploy
      const projectSlug = slugify(productName)
      const watermarkedHtml = html ? watermark(html, { sessionId: session.id, customerEmail: customerEmail || '', plan }) : null
      const liveUrl = watermarkedHtml ? await deployToVercel(projectSlug, watermarkedHtml) : null

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
