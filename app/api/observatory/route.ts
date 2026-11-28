export const runtime = 'edge'

import { getDb } from '@/app/lib/db'

async function auth(req: Request): Promise<boolean> {
  const secret = process.env.AUDIT_SECRET
  if (!secret) return false
  const provided = req.headers.get('x-admin-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!provided) return false
  const enc = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(secret)),
  ])
  const av = new Uint8Array(a), bv = new Uint8Array(b)
  let diff = av.length ^ bv.length
  for (let i = 0; i < Math.max(av.length, bv.length); i++) diff |= (av[i] ?? 0) ^ (bv[i] ?? 0)
  return diff === 0
}

export async function GET(req: Request): Promise<Response> {
  if (!(await auth(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const source = url.searchParams.get('source') || null
  const set = url.searchParams.get('set') || null
  const status = url.searchParams.get('status') || null
  const model = url.searchParams.get('model') || null
  const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500)

  const sql = getDb()

  // Build dynamic query — Neon serverless supports tagged template literals only,
  // so we select all and filter in JS for simplicity given small dataset
  const rows = await sql`
    SELECT
      id, source, comparison_set, candidate_id, candidate_label, run_number,
      product_name, brief_text, model, temperature,
      input_tokens, output_tokens, cost_usd, elapsed_ms, html_bytes,
      generated_at, approval_status, approval_reason, approved_at, approved_by,
      quality_score, quality_notes, created_at
    FROM observatory_generations
    ORDER BY generated_at DESC
    LIMIT ${limit}
  `

  let results = rows as Record<string, unknown>[]

  if (source) results = results.filter(r => r.source === source)
  if (set) results = results.filter(r => r.comparison_set === set)
  if (status) results = results.filter(r => r.approval_status === status)
  if (model) results = results.filter(r => r.model === model)

  const totalCost = results.reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)
  const models = [...new Set(results.map(r => r.model as string))]
  const sets = [...new Set(results.filter(r => r.comparison_set).map(r => r.comparison_set as string))]

  return Response.json({
    generations: results,
    meta: {
      total: results.length,
      totalCostUSD: totalCost,
      models,
      comparisonSets: sets,
    },
  })
}

export async function POST(req: Request): Promise<Response> {
  if (!(await auth(req))) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action, reason, qualityScore, qualityNotes } = await req.json() as {
    id?: string
    action?: string
    reason?: string
    qualityScore?: number
    qualityNotes?: string
  }

  if (!id || !action) return Response.json({ error: 'id and action required' }, { status: 400 })
  if (!['approve', 'reject', 'score'].includes(action)) {
    return Response.json({ error: 'action must be approve, reject, or score' }, { status: 400 })
  }

  const sql = getDb()

  if (action === 'approve') {
    await sql`
      UPDATE observatory_generations
      SET approval_status = 'approved',
          approval_reason = ${reason ?? null},
          approved_at = now(),
          approved_by = 'admin'
      WHERE id = ${id}
    `
  } else if (action === 'reject') {
    await sql`
      UPDATE observatory_generations
      SET approval_status = 'rejected',
          approval_reason = ${reason ?? null},
          approved_at = now(),
          approved_by = 'admin'
      WHERE id = ${id}
    `
  } else if (action === 'score') {
    if (qualityScore !== undefined && (qualityScore < 0 || qualityScore > 100)) {
      return Response.json({ error: 'qualityScore must be 0-100' }, { status: 400 })
    }
    await sql`
      UPDATE observatory_generations
      SET quality_score = ${qualityScore ?? null},
          quality_notes = ${qualityNotes ?? null}
      WHERE id = ${id}
    `
  }

  return Response.json({ ok: true, id, action })
}
