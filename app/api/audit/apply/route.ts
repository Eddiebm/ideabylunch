export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { applyAuditPatches, deployPreviewToVercel } from '@/app/lib/deploy'
import type { StoredAudit } from '@/app/api/audit/route'

const MAX_APPLIES_PER_DAY = 3

function parseJson<T>(raw: unknown): T | null {
  if (!raw) return null
  return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T)
}

export type ApplyRecord = {
  applyId: string
  siteId: string
  slug: string
  projectSlug: string
  customerEmail: string
  previewUrl: string
  previewDeploymentId: string
  applied: string[]
  before: { h1: string | null; title: string | null; description: string | null }
  status: 'preview' | 'shipped' | 'rolled_back'
  createdAt: number
}

// Only sites we deployed ourselves have a live single-file HTML we can
// safely rewrite and redeploy as a preview. Everything below assumes that
// architecture — see AUDIT_AUTOFIX_SCOPE.md for the corrected read on it.
export async function POST(req: NextRequest) {
  try {
    const { slug, siteId } = (await req.json()) as { slug?: string; siteId?: string }
    if (!slug || !siteId) return Response.json({ error: 'slug and siteId required' }, { status: 400 })

    const redis = getRedis()
    if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

    // Auth — must be logged into the customer dashboard (i2l_session)
    const sessionToken = req.cookies.get('i2l_session')?.value
    if (!sessionToken) return Response.json({ error: 'unauthenticated' }, { status: 401 })
    const email = await redis.get<string>(`session:${sessionToken}`)
    if (!email) return Response.json({ error: 'unauthenticated' }, { status: 401 })

    // Ownership — the calling account must own this exact site
    const order = parseJson<any>(await redis.get(`order:${siteId}`))
    if (!order) return Response.json({ error: 'site not found' }, { status: 404 })
    if (String(order.customerEmail || '').toLowerCase() !== String(email).toLowerCase()) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
    if (!order.liveUrl) return Response.json({ error: 'site has no live deployment' }, { status: 400 })

    // Rate limit — 3 applies per site per day, before we do any real work
    const rateKey = `apply:rate:${siteId}`
    const count = Number(await redis.get(rateKey)) || 0
    if (count >= MAX_APPLIES_PER_DAY) {
      return Response.json({ error: 'rate_limited', limit: MAX_APPLIES_PER_DAY }, { status: 429 })
    }

    const stored = parseJson<StoredAudit>(await redis.get(`audit:${slug}`))
    if (!stored) return Response.json({ error: 'audit not found' }, { status: 404 })

    // Source of truth is whatever's live right now, not a cached copy —
    // dashboard edits since the site was first deployed must not be
    // clobbered by a stale snapshot.
    let currentHtml: string
    try {
      const liveRes = await fetch(order.liveUrl, { signal: AbortSignal.timeout(15000) })
      if (!liveRes.ok) return Response.json({ error: 'could not fetch live site' }, { status: 502 })
      currentHtml = await liveRes.text()
    } catch {
      return Response.json({ error: 'could not fetch live site' }, { status: 502 })
    }

    const { html: patchedHtml, applied } = applyAuditPatches(currentHtml, stored.audit)
    if (!applied.length) {
      return Response.json(
        { error: 'no_patches_applied', detail: "Couldn't find matching sections to rewrite on this site." },
        { status: 422 },
      )
    }

    const projectSlug: string | null = order.projectSlug || (() => {
      try { return new URL(order.liveUrl).hostname.split('.')[0] } catch { return null }
    })()
    if (!projectSlug) return Response.json({ error: 'no project reference for this site' }, { status: 500 })

    const preview = await deployPreviewToVercel(projectSlug, patchedHtml)
    if (!preview) return Response.json({ error: 'preview deploy failed' }, { status: 502 })

    await redis.incr(rateKey)
    await redis.expire(rateKey, 60 * 60 * 24)

    const applyId = crypto.randomUUID()
    const record: ApplyRecord = {
      applyId,
      siteId,
      slug,
      projectSlug,
      customerEmail: String(email),
      previewUrl: preview.url,
      previewDeploymentId: preview.id,
      applied,
      before: { h1: stored.current.h1, title: stored.current.title, description: stored.current.description },
      status: 'preview',
      createdAt: Date.now(),
    }
    await redis.set(`apply:${applyId}`, JSON.stringify(record), { ex: 60 * 60 * 24 * 7 })
    await redis.zadd('audit:applies', { score: Date.now(), member: JSON.stringify({ applyId, siteId, slug, email }) })

    return Response.json({ applyId, previewUrl: preview.url, applied })
  } catch (err: unknown) {
    console.error('audit apply error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'apply failed' }, { status: 500 })
  }
}
