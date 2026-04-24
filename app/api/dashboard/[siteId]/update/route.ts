export const runtime = 'edge'
import { Redis } from '@upstash/redis'
import Stripe from 'stripe'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

function replaceHtmlContent(html: string, updates: Record<string, string>): string {
  let result = html

  if (updates.heroTitle) {
    result = result.replace(/<h1[^>]*>.*?<\/h1>/i, `<h1>${escapeHtml(updates.heroTitle)}</h1>`)
  }

  if (updates.heroDescription) {
    result = result.replace(
      /(<h1[^>]*>.*?<\/h1>\s*)<p[^>]*>.*?<\/p>/i,
      `$1<p>${escapeHtml(updates.heroDescription)}</p>`,
    )
  }

  if (updates.heroImageUrl) {
    result = result.replace(/src="[^"]*"(?=[^>]*(?:class|alt)="[^"]*hero)/i, `src="${escapeHtml(updates.heroImageUrl)}"`)
  }

  if (updates.ctaText) {
    result = result.replace(
      /<a[^>]*class="[^"]*cta[^"]*"[^>]*>.*?<\/a>/i,
      `<a href="#" class="cta">${escapeHtml(updates.ctaText)}</a>`,
    )
  }

  return result
}

async function deployToVercel(siteId: string, html: string): Promise<string | null> {
  const token = process.env.VERCEL_DEPLOY_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return null

  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: siteId,
      target: 'production',
      project: siteId,
      files: [{ file: 'index.html', data: html }],
      projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
    }),
  })

  if (!res.ok) return null
  const data: any = await res.json()
  const url = data?.url || data?.alias?.[0]
  return url ? url.replace(/^https?:\/\//, '') : null
}

export async function POST(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const { siteId } = await params
    const body = await req.json() as {
      token: string
      heroTitle?: string
      heroDescription?: string
      heroImageUrl?: string
      ctaText?: string
    }

    const redis = getRedis()
    if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

    // Validate auth token
    const authRaw = await redis.get(`dashboard:token:${body.token}`)
    const auth: any = authRaw ? (typeof authRaw === 'string' ? JSON.parse(authRaw) : authRaw) : null
    if (!auth || auth.siteId !== siteId || (auth.expiresAt && Date.now() > auth.expiresAt)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch site
    const orderRaw = await redis.get(`order:${siteId}`)
    const order: any = orderRaw ? (typeof orderRaw === 'string' ? JSON.parse(orderRaw) : orderRaw) : null
    if (!order) return Response.json({ error: 'Site not found' }, { status: 404 })

    const editCount = order.editCount || 0

    // Check if they've exceeded free edits
    if (editCount >= 3) {
      // Need payment
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://idea2lunch.com'
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: auth.email || 'customer@example.com',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: 799, // $7.99
              product_data: { name: 'Unlimited edits for ' + order.productName },
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/dashboard/${siteId}/edit?token=${body.token}&paid=1`,
        cancel_url: `${appUrl}/dashboard/${siteId}/edit?token=${body.token}`,
        metadata: {
          siteId,
          type: 'edit_unlock',
        },
      })

      return Response.json({
        needsPayment: true,
        paymentUrl: session.url,
        amount: 799,
      })
    }

    // Free edit allowed — proceed
    const updates = {
      heroTitle: body.heroTitle || '',
      heroDescription: body.heroDescription || '',
      heroImageUrl: body.heroImageUrl || '',
      ctaText: body.ctaText || '',
    }

    const updatedHtml = replaceHtmlContent(order.selectedHtml, updates)

    // Deploy to Vercel
    const liveUrl = await deployToVercel(siteId, updatedHtml)

    // Save updated order
    await redis.set(
      `order:${siteId}`,
      JSON.stringify({
        ...order,
        selectedHtml: updatedHtml,
        content: updates,
        editCount: editCount + 1,
        lastEditedAt: Date.now(),
        liveUrl: liveUrl || order.liveUrl,
      }),
      { ex: 60 * 60 * 24 * 365 },
    )

    return Response.json({
      ok: true,
      editCount: editCount + 1,
      liveUrl: liveUrl || order.liveUrl,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'update failed'
    console.error('dashboard update error:', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
