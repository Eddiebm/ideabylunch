export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'

export type BusinessProfile = {
  email: string
  business: string
  businessType: string
  location: string
  services: string
  customer: string
  updatedAt: number
}

// GET /api/grow/profile?email=x
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')?.toLowerCase()
  if (!email) return Response.json({ error: 'email required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const raw = await redis.get(`grow:profile:${email}`)
  if (!raw) return Response.json({ profile: null })

  const profile = typeof raw === 'string' ? JSON.parse(raw) : raw
  return Response.json({ profile })
}

// POST /api/grow/profile — create or update
export async function POST(req: Request) {
  const body = await req.json()
  const { email, business, businessType, location, services, customer } = body

  if (!email || !business) return Response.json({ error: 'email and business required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  const profile: BusinessProfile = {
    email: email.toLowerCase(),
    business,
    businessType: businessType || '',
    location: location || '',
    services: services || '',
    customer: customer || '',
    updatedAt: Date.now(),
  }

  await redis.set(`grow:profile:${email.toLowerCase()}`, JSON.stringify(profile), {
    ex: 60 * 60 * 24 * 365 * 2,
  })
  await redis.sadd('grow:delivery:subscribers', email.toLowerCase())

  return Response.json({ ok: true, profile })
}
