import { Redis } from '@upstash/redis'

export const runtime = 'edge'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function POST(req: Request) {
  try {
    const { businessName, industry, tone = 'professional' } = await req.json()
    if (!businessName || !industry) {
      return Response.json({ error: 'businessName and industry required' }, { status: 400 })
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Generate exactly 10 short, punchy taglines for a ${industry} business called "${businessName}".
Tone: ${tone}
Rules:
- Each tagline under 8 words
- No clichés ("Taking it to the next level", "Your trusted partner", etc.)
- Be specific to the industry
- Mix styles: benefit-led, emotional, witty, bold
- One per line, no numbering, no quotes
Return exactly 10 lines.`,
        }],
      }),
    })

    const data: any = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    const all = text.split('\n').map((l: string) => l.trim()).filter(Boolean).slice(0, 10)

    if (all.length < 3) {
      return Response.json({ error: 'Generation failed' }, { status: 500 })
    }

    // Free tier: first 3. Paid: all 10.
    // Cache the full set keyed by businessName+industry so payment can retrieve them
    const cacheKey = `taglines:${businessName.toLowerCase().replace(/\s+/g, '-')}:${industry.toLowerCase().replace(/\s+/g, '-')}`
    const redis = getRedis()
    if (redis) {
      await redis.set(cacheKey, JSON.stringify(all), { ex: 60 * 60 * 24 * 7 })
    }

    return Response.json({
      free: all.slice(0, 3),
      cacheKey,
      total: all.length,
      unlockUrl: process.env.STRIPE_TAGLINE_PAYMENT_LINK || null,
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// Called after Stripe payment to retrieve full set
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  // Next.js 15+ searchParams is sync on Request URL — no await needed here
  const cacheKey = searchParams.get('key')
  if (!cacheKey) return Response.json({ error: 'key required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 500 })

  const raw = await redis.get(cacheKey)
  if (!raw) return Response.json({ error: 'Expired or not found' }, { status: 404 })

  const all = typeof raw === 'string' ? JSON.parse(raw) : raw
  return Response.json({ taglines: all })
}
