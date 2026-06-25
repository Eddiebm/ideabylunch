export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'

export async function POST(req: Request) {
  const secret = process.env.AUDIT_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { count = 10 } = await req.json().catch(() => ({})) as { count?: number }
  const n = Math.min(Number(count) || 10, 50)

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
  const links: string[] = []

  for (let i = 1; i <= n; i++) {
    const arr = new Uint8Array(16)
    crypto.getRandomValues(arr)
    const token = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
    await redis.set(`access:${token}`, `tester-${i}@ideabylunch.com`)
    links.push(`${appUrl}/api/access/${token}`)
  }

  return Response.json({ links })
}
