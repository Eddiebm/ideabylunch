export interface OrderSlots {
  heroHeadline?: string
  aboutText?: string
  servicesList?: string
  contactInfo?: string
  footerTagline?: string
}

export async function deployToVercel(projectSlug: string, html: string): Promise<string | null> {
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
  if (!res.ok) {
    console.error('Vercel deploy failed', res.status, await res.text())
    return null
  }
  const data: any = await res.json()
  const url = data?.url || data?.alias?.[0]
  return url ? `https://${url.replace(/^https?:\/\//, '')}` : null
}

export function slugify(name: string): string {
  return (name || 'site')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7)
}

export function injectConceptVideo(html: string, videoUrl: string): string {
  if (!videoUrl || !html.includes('</body>')) return html
  const snippet = `
<div style="width:100%;overflow:hidden;line-height:0;max-height:520px">
  <video src="${videoUrl}" autoplay loop muted playsinline style="width:100%;max-height:520px;object-fit:cover;display:block"></video>
</div>`
  // Insert as first child of <body> — before any nav or hero
  return html.replace(/<body([^>]*)>/, `<body$1>${snippet}`)
}

function cleanToken(raw: string | undefined): string | null {
  if (!raw) return null
  return raw.trim().replace(/\\n$/, '').replace(/^["']|["']$/g, '')
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/** Deploy html as a Vercel PREVIEW deployment — no `target`, so it is
 * never aliased to production domains. Used by the audit auto-apply flow
 * so a customer can review before shipping. Not exercised against a live
 * Vercel account in the session that wrote this — verify before relying
 * on it for real customer sites. */
export async function deployPreviewToVercel(projectSlug: string, html: string): Promise<{ url: string; id: string } | null> {
  const token = cleanToken(process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN)
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return null

  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: projectSlug,
      project: projectSlug,
      files: [{ file: 'index.html', data: html }],
      projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
    }),
  })
  if (!res.ok) {
    console.error('Vercel preview deploy failed', res.status, await res.text().catch(() => ''))
    return null
  }
  const data: any = await res.json()
  if (!data?.id || !data?.url) return null
  return { id: data.id, url: `https://${String(data.url).replace(/^https?:\/\//, '')}` }
}

/** Promote an existing preview deployment to production. Uses Vercel's
 * projects/promote endpoint — verify this against current Vercel API docs
 * before relying on it; not exercised against a live account here. */
export async function promoteDeployment(projectSlug: string, deploymentId: string): Promise<boolean> {
  const token = cleanToken(process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN)
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return false

  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectSlug}/promote/${deploymentId}${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) console.error('Vercel promote failed', res.status, await res.text().catch(() => ''))
  return res.ok
}

/** Delete a preview deployment (rollback) — never touches production. */
export async function deleteDeployment(deploymentId: string): Promise<boolean> {
  const token = cleanToken(process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN)
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return false

  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}${qs}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.ok
}

type AuditForPatch = {
  rewrite: { h1: string; sub: string }
  faqs: Array<{ q: string; a: string }>
  tierRename: Array<{ from: string; to: string }>
}

function buildFaqSection(faqs: Array<{ q: string; a: string }>): string {
  const items = faqs.map(f => `
    <details style="margin:0 0 10px;padding:16px 20px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
      <summary style="cursor:pointer;font-weight:600;font-size:16px;color:#1D1D1F">${escapeHtml(f.q)}</summary>
      <p style="margin:10px 0 0;color:#6E6E73;font-size:14px;line-height:1.6">${escapeHtml(f.a)}</p>
    </details>`).join('')
  return `<section style="max-width:720px;margin:48px auto;padding:0 24px;font-family:-apple-system,sans-serif">
  <h2 style="font-size:24px;font-weight:700;color:#1D1D1F;margin:0 0 16px">Frequently asked questions</h2>
  ${items}
</section>`
}

function buildFaqJsonLd(faqs: Array<{ q: string; a: string }>): string {
  const json = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  return `<script type="application/ld+json">${JSON.stringify(json).replace(/</g, '\\u003c')}</script>`
}

/** Apply an audit's rewrite to a customer's live HTML via best-effort string
 * patches (there's no retained source template per site — deployed sites
 * are a single generated index.html). Returns which sections it actually
 * found and changed, so the caller can refuse to deploy a no-op. */
export function applyAuditPatches(html: string, audit: AuditForPatch): { html: string; applied: string[] } {
  let out = html
  const applied: string[] = []
  const { rewrite, faqs, tierRename } = audit

  if (rewrite?.h1 && /<h1[^>]*>[\s\S]*?<\/h1>/i.test(out)) {
    out = out.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/i, (_m, attrs) => `<h1${attrs}>${escapeHtml(rewrite.h1)}</h1>`)
    applied.push('hero h1')
  }
  if (rewrite?.sub && /<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>[\s\S]*?<\/p>/i.test(out)) {
    out = out.replace(
      /(<h1[^>]*>[\s\S]*?<\/h1>\s*<p)([^>]*)(>)[\s\S]*?(<\/p>)/i,
      (_m, open, attrs, gt, close) => `${open}${attrs}${gt}${escapeHtml(rewrite.sub)}${close}`,
    )
    applied.push('hero subhead (best-effort match)')
  }
  for (const t of tierRename || []) {
    if (t.from && t.to && out.includes(t.from)) {
      out = out.split(t.from).join(escapeHtml(t.to))
      applied.push(`tier "${t.from}" → "${t.to}"`)
    }
  }
  if (faqs?.length && out.includes('</body>')) {
    out = out.replace('</body>', `${buildFaqSection(faqs)}\n${buildFaqJsonLd(faqs)}\n</body>`)
    applied.push('faq + json-ld')
  }
  return { html: out, applied }
}

export function applySlots(html: string, slots: OrderSlots): string {
  let out = html
  if (slots.heroHeadline) out = out.replace(/{{heroHeadline}}/g, slots.heroHeadline)
  if (slots.aboutText)    out = out.replace(/{{aboutText}}/g, slots.aboutText)
  if (slots.servicesList) out = out.replace(/{{servicesList}}/g, slots.servicesList)
  if (slots.contactInfo)  out = out.replace(/{{contactInfo}}/g, slots.contactInfo)
  if (slots.footerTagline) out = out.replace(/{{footerTagline}}/g, slots.footerTagline)
  // Inject branded backlink before </body> if not already present
  if (!out.includes('ideabylunch.com') && out.includes('</body>')) {
    out = out.replace(
      '</body>',
      `<div style="text-align:center;padding:12px;font-size:12px;color:#AEAEB2;font-family:-apple-system,sans-serif">
        Built with <a href="https://ideabylunch.com" style="color:#0066CC;text-decoration:none" target="_blank">IdeaByLunch</a>
      </div></body>`
    )
  }
  return out
}
