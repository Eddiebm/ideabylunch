export const runtime = 'nodejs'

import { Resend } from 'resend'
import { Redis } from '@upstash/redis'
import { generateHtmlFromBrief, extractProductName } from '@/app/lib/generate'

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

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'site'
}

function watermark(html: string, email: string): string {
  const banner = `<!--
  Built by IdeaByLunch — https://ideabylunch.com
  Free build for: ${email}
  Built: ${new Date().toISOString()}
-->\n`
  return html.replace(/^<!DOCTYPE[^>]*>/i, m => `${banner}${m}`)
}

async function deployToVercel(projectSlug: string, html: string): Promise<string | null> {
  const token = cleanToken(process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN)
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
      projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null, devCommand: null },
    }),
  })
  if (!res.ok) return null
  const data: any = await res.json()
  const url = data?.url || data?.alias?.[0]

  await fetch(`https://api.vercel.com/v10/projects/${projectSlug}${qs}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ssoProtection: null, passwordProtection: null }),
  }).catch(() => {})

  return url ? `https://${url.replace(/^https?:\/\//, '')}` : null
}

export async function POST(req: Request) {
  try {
    const { token, email, brief, selectedHtml } = await req.json()

    // Validate token
    const validToken = process.env.FREE_BUILD_TOKEN
    if (!validToken || token !== validToken) {
      return Response.json({ error: 'Invalid access token' }, { status: 403 })
    }

    if (!email?.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!brief?.trim()) {
      return Response.json({ error: 'Brief required' }, { status: 400 })
    }

    const redis = getRedis()

    // Check usage cap
    const FREE_BUILD_LIMIT = 50
    const usageKey = 'free-build:count'
    if (redis) {
      const used = await redis.incr(usageKey)
      if (used > FREE_BUILD_LIMIT) {
        await redis.decr(usageKey) // roll back
        return Response.json({ error: 'Free builds are fully claimed — follow ideabylunch.com for updates.' }, { status: 403 })
      }
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const adminEmail = process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com'

    const productName = extractProductName(brief)
    const projectSlug = slugify(productName)

    // Generate HTML if not provided
    const rawHtml = selectedHtml || await generateHtmlFromBrief(brief, productName, 'starter', [])
    const html = rawHtml ? watermark(rawHtml, email) : null

    // Deploy
    const liveUrl = html ? await deployToVercel(projectSlug, html) : null

    // Save to Redis
    const siteId = `free_${Date.now().toString(36)}`
    if (redis) {
      await redis.set(`order:${siteId}`, JSON.stringify({
        siteId,
        customerEmail: email,
        productName,
        brief,
        status: liveUrl ? 'deployed' : 'needs_manual_build',
        liveUrl,
        plan: 'free',
        createdAt: Date.now(),
        deployedAt: liveUrl ? Date.now() : null,
      }), { ex: 60 * 60 * 24 * 90 })
      if (liveUrl) await redis.incr('stats:deploys')
    }

    // Email customer
    if (liveUrl) {
      await resend.emails.send({
        from: `IdeaByLunch <${process.env.RESEND_FROM || 'hello@ideabylunch.com'}>`,
        to: email,
        subject: `✦ Your site is live — ${productName}`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px">
          <h2 style="font-size:22px;font-weight:700;color:#1D1D1F;margin:0 0 16px">Your site is live.</h2>
          <p style="font-size:15px;color:#3C3C43;line-height:1.6;margin:0 0 20px"><strong>${productName}</strong> is deployed and ready.</p>
          <a href="${liveUrl}" style="display:inline-block;background:#1D1D1F;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px">View your site →</a>
          <p style="font-size:13px;color:#AEAEB2;line-height:1.6">One ask: 20 minutes of honest feedback. What worked, what didn't, what was missing. Just reply to this email.</p>
          <p style="font-size:13px;color:#AEAEB2;margin-top:24px">— Eddie, IdeaByLunch</p>
        </div>`,
      }).catch(() => {})
    }

    // Notify Eddie
    await resend.emails.send({
      from: `IdeaByLunch <${process.env.RESEND_FROM || 'hello@ideabylunch.com'}>`,
      to: adminEmail,
      subject: `🎁 Free build — ${productName} — ${email}`,
      html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;padding:16px">
        <h2 style="font-size:18px;margin:0 0 8px">Free build triggered</h2>
        <p style="font-size:13px;color:#6E6E73;margin:0 0 16px">${email} · ${productName}</p>
        ${liveUrl ? `<p><a href="${liveUrl}" style="color:#0066CC">${liveUrl}</a></p>` : '<p style="color:#FF3B30">Deploy failed — needs manual build</p>'}
      </div>`,
    }).catch(() => {})

    return Response.json({ ok: true, liveUrl, productName })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Build failed' }, { status: 500 })
  }
}
