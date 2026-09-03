export const runtime = 'nodejs'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'
import { promoteDeployment, deleteDeployment } from '@/app/lib/deploy'
import type { ApplyRecord } from '@/app/api/audit/apply/route'

function parseJson<T>(raw: unknown): T | null {
  if (!raw) return null
  return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T)
}

// Handles both "Ship to production" and "Roll back" from the applied-preview
// page. Never called automatically — only from an explicit customer click.
export async function POST(req: NextRequest) {
  try {
    const { applyId, action } = (await req.json()) as { applyId?: string; action?: 'promote' | 'rollback' }
    if (!applyId || (action !== 'promote' && action !== 'rollback')) {
      return Response.json({ error: 'applyId and action (promote|rollback) required' }, { status: 400 })
    }

    const redis = getRedis()
    if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

    const sessionToken = req.cookies.get('i2l_session')?.value
    if (!sessionToken) return Response.json({ error: 'unauthenticated' }, { status: 401 })
    const email = await redis.get<string>(`session:${sessionToken}`)
    if (!email) return Response.json({ error: 'unauthenticated' }, { status: 401 })

    const record = parseJson<ApplyRecord>(await redis.get(`apply:${applyId}`))
    if (!record) return Response.json({ error: 'apply not found — preview may have expired' }, { status: 404 })
    if (String(record.customerEmail).toLowerCase() !== String(email).toLowerCase()) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
    if (record.status !== 'preview') {
      return Response.json({ error: `already ${record.status}` }, { status: 409 })
    }

    if (action === 'rollback') {
      await deleteDeployment(record.previewDeploymentId)
      const updated: ApplyRecord = { ...record, status: 'rolled_back' }
      await redis.set(`apply:${applyId}`, JSON.stringify(updated), { ex: 60 * 60 * 24 * 7 })
      return Response.json({ ok: true, status: 'rolled_back' })
    }

    const ok = await promoteDeployment(record.projectSlug, record.previewDeploymentId)
    if (!ok) return Response.json({ error: 'promote failed' }, { status: 502 })

    const updated: ApplyRecord = { ...record, status: 'shipped' }
    await redis.set(`apply:${applyId}`, JSON.stringify(updated), { ex: 60 * 60 * 24 * 7 })

    // Reflect the shipped state on the order record too
    const order = parseJson<any>(await redis.get(`order:${record.siteId}`))
    if (order) {
      await redis.set(
        `order:${record.siteId}`,
        JSON.stringify({ ...order, lastAppliedAuditSlug: record.slug, lastAppliedAt: Date.now() }),
        { ex: 60 * 60 * 24 * 365 },
      )
    }

    return Response.json({ ok: true, status: 'shipped', productionUrl: order?.liveUrl || null })
  } catch (err: unknown) {
    console.error('audit promote error:', err)
    return Response.json({ error: err instanceof Error ? err.message : 'promote failed' }, { status: 500 })
  }
}
