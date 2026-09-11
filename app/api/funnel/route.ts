// Client-side funnel step recorder — for steps that happen in the browser
// (idea_viewed and brief_started can't be recorded server-side without SSR overhead)
// POST { step: 'idea_viewed' | 'brief_started' }

export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'
import { trackFunnelStep, type FunnelStep } from '@/app/lib/funnel'

const CLIENT_STEPS: FunnelStep[] = ['idea_viewed', 'brief_started']

export async function POST(req: Request) {
  const { step } = await req.json().catch(() => ({})) as { step?: string }
  if (!step || !CLIENT_STEPS.includes(step as FunnelStep)) {
    return Response.json({ ok: false }, { status: 400 })
  }
  // Fire-and-forget — if Redis is down, don't fail the page
  trackFunnelStep(getRedis(), step as FunnelStep).catch(() => {})
  return Response.json({ ok: true })
}
