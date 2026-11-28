export const runtime = 'edge'

import { getDb } from '@/app/lib/db'

async function auth(req: Request): Promise<boolean> {
  const secret = process.env.AUDIT_SECRET
  if (!secret) return false
  // Accept via header or query param (for iframe src usage)
  const url = new URL(req.url)
  const provided =
    req.headers.get('x-admin-secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    url.searchParams.get('ak') ||
    null
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  if (!(await auth(req))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params
  const sql = getDb()
  const rows = await sql`
    SELECT html_content, product_name, candidate_label, model, generated_at
    FROM observatory_generations
    WHERE id = ${id}
    LIMIT 1
  `

  if (!rows.length) return new Response('Not found', { status: 404 })

  const row = rows[0] as { html_content: string; product_name: string; candidate_label: string; model: string; generated_at: string }

  return new Response(row.html_content, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Prevent indexing and embedding outside the Observatory
      'X-Robots-Tag': 'noindex',
      'X-Frame-Options': 'SAMEORIGIN',
      // Restrict CSP to allow Google Fonts (used by generated sites) but block external scripts
      'Content-Security-Policy': [
        "default-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https:",
        "script-src 'self' 'unsafe-inline'",
        "frame-ancestors 'self'",
      ].join('; '),
      'Cache-Control': 'private, no-store',
    },
  })
}
