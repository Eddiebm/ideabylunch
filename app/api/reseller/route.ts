import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

async function verifyAdminSecret(provided: string | null): Promise<boolean> {
  const expected = process.env.ADMIN_SECRET
  if (!provided || !expected) return false
  const enc = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  const av = new Uint8Array(a), bv = new Uint8Array(b)
  let diff = av.length ^ bv.length
  for (let i = 0; i < av.length; i++) diff |= av[i] ^ bv[i]
  return diff === 0
}

// POST — create or update reseller account
// GET  — get reseller stats by code

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) return Response.json({ error: 'code required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const raw = await redis.get(`reseller:${code}`)
  if (!raw) return Response.json({ error: 'not found' }, { status: 404 })

  const reseller: any = typeof raw === 'string' ? JSON.parse(raw) : raw
  const sales = Number(await redis.get(`reseller:sales:${code}`)) || 0
  const revenue = Number(await redis.get(`reseller:revenue:${code}`)) || 0

  return Response.json({
    ...reseller,
    sales,
    revenue,
    commission: Math.round(revenue * reseller.commissionRate),
    link: `https://idea2lunch.com/?ref=${code}`,
  })
}

export async function POST(req: Request) {
  if (!(await verifyAdminSecret(req.headers.get('x-admin-secret')))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { code, name, email, commissionRate = 0.20, products } = body
  if (!code || !name || !email) {
    return Response.json({ error: 'code, name, email required' }, { status: 400 })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const reseller = {
    code, name, email, commissionRate,
    products: products || ['idea2lunch', 'medos', 'lexos', 'busos'],
    createdAt: Date.now(),
  }

  await redis.set(`reseller:${code}`, JSON.stringify(reseller))
  await redis.set(`refer:code:${code}`, email, { ex: 60 * 60 * 24 * 365 * 5 })

  return Response.json({ ok: true, reseller, link: `https://idea2lunch.com/?ref=${code}` })
}
