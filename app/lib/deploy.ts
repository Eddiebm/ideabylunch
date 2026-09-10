export interface OrderSlots {
  heroHeadline?: string
  aboutText?: string
  servicesList?: string
  contactInfo?: string
  footerTagline?: string
}

export interface DeployResult {
  previewUrl: string
  deploymentId: string
}

// Deploys to a PREVIEW environment only — never directly to production.
// Call promoteDeployment() after explicit human approval to go live.
export async function deployToVercel(projectSlug: string, html: string): Promise<DeployResult | null> {
  const token = process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return null

  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: projectSlug,
      target: 'preview',
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
  const rawUrl = data?.url || data?.alias?.[0]
  const previewUrl = rawUrl ? `https://${rawUrl.replace(/^https?:\/\//, '')}` : null
  if (!previewUrl || !data?.id) return null
  return { previewUrl, deploymentId: data.id }
}

// Promotes an existing preview deployment to production.
// Must only be called after explicit human approval (e.g. a signed admin action).
export async function promoteDeployment(deploymentId: string): Promise<string | null> {
  const token = process.env.VERCEL_DEPLOY_TOKEN || process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  if (!token) return null

  const qs = teamId ? `?teamId=${teamId}` : ''
  const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}${qs}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: 'production' }),
  })
  if (!res.ok) {
    console.error('Vercel promote failed', res.status, await res.text())
    return null
  }
  const data: any = await res.json()
  const rawUrl = data?.url || data?.alias?.[0]
  return rawUrl ? `https://${rawUrl.replace(/^https?:\/\//, '')}` : null
}

export function slugify(name: string): string {
  return (name || 'site')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) + '-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2,'0')).join('')
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
