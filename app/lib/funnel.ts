// Funnel tracking — records conversion counts at each step of the customer journey.
// Steps are ordered; each is stored as a Redis incr counter.
// Admin/stats reads these to surface conversion rates and identify bottlenecks.

import type { Redis } from '@upstash/redis'

export type FunnelStep =
  | 'idea_viewed'        // loaded the main page (instrumented client-side)
  | 'brief_started'      // began filling the brief / IdeaWizard
  | 'site_generated'     // first full site HTML returned
  | 'checkout_initiated' // clicked a pay button
  | 'payment_completed'  // Stripe/Paystack webhook confirmed
  | 'site_deployed'      // site live on Vercel

export const FUNNEL_ORDER: FunnelStep[] = [
  'idea_viewed',
  'brief_started',
  'site_generated',
  'checkout_initiated',
  'payment_completed',
  'site_deployed',
]

const PREFIX = 'funnel:step:'
const DAILY_PREFIX = 'funnel:daily:'

function dailyKey(step: FunnelStep, ts: number): string {
  // YYYY-MM-DD bucket
  const d = new Date(ts)
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  return `${DAILY_PREFIX}${date}:${step}`
}

export async function trackFunnelStep(
  redis: Redis | null,
  step: FunnelStep,
  ts: number = Date.now(),
): Promise<void> {
  if (!redis) return
  await Promise.all([
    redis.incr(`${PREFIX}${step}`),
    redis.incr(dailyKey(step, ts)),
    // Daily keys expire after 90 days
    redis.expire(dailyKey(step, ts), 60 * 60 * 24 * 90),
  ])
}

export async function getFunnelStats(redis: Redis | null): Promise<{
  steps: Array<{ step: FunnelStep; count: number; dropOff: number | null; conversionRate: number | null }>
  bottleneck: FunnelStep | null
}> {
  if (!redis) return { steps: [], bottleneck: null }

  const keys = FUNNEL_ORDER.map(s => `${PREFIX}${s}`)
  const counts = await redis.mget<(string | null)[]>(...keys)

  const steps = FUNNEL_ORDER.map((step, i) => {
    const count = Number(counts[i]) || 0
    const prevCount = i > 0 ? (Number(counts[i - 1]) || 0) : null
    const dropOff = prevCount !== null && prevCount > 0 ? prevCount - count : null
    const conversionRate = prevCount !== null && prevCount > 0
      ? Math.round((count / prevCount) * 100) / 100
      : null
    return { step, count, dropOff, conversionRate }
  })

  // Bottleneck = step with the worst conversion rate (excluding first step)
  let bottleneck: FunnelStep | null = null
  let worstRate = 1
  for (const s of steps.slice(1)) {
    if (s.conversionRate !== null && s.conversionRate < worstRate) {
      worstRate = s.conversionRate
      bottleneck = s.step
    }
  }

  return { steps, bottleneck }
}
