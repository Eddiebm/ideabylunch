export const runtime = 'edge'
import { revokeDashboardTokens } from '@/app/lib/auth'

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { siteId } = await req.json()
  if (!siteId || typeof siteId !== 'string') {
    return Response.json({ error: 'siteId required' }, { status: 400 })
  }

  await revokeDashboardTokens(siteId)
  return Response.json({ ok: true, siteId })
}
