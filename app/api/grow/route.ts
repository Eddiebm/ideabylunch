export const runtime = 'edge'
import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

const FREE_LIMIT = 1
const EMAIL_LIMIT = 5

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

const SYSTEM_PROMPT = `You are a world-class marketing director for local small businesses. Generate a complete, ready-to-use 30-day marketing kit. Be hyper-specific to the exact business and location — no generic filler. Every piece of content must be copy-pasteable and ready to use today.

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS (use these exact headers with ---):

---
## 30 Social Media Posts

Post 1 | Day 1 | Instagram
[Caption — 2-3 punchy sentences specific to this business. End with a question or CTA.]
Hashtags: #[relevant] #[location] #[industry]

Post 2 | Day 2 | Facebook
[Caption]
Hashtags: [hashtags]

[Continue for all 30 posts. Vary platforms (Instagram, Facebook, TikTok). Vary content types: tip, offer, behind-the-scenes, customer win, FAQ, seasonal, local love. Each post must feel handwritten for this specific business.]

---
## Monthly Customer Email

Subject: [Compelling subject line under 50 chars]

[Full email body — 150-200 words. Warm, direct tone. Include a specific offer or update. End with one clear CTA. Ready to copy into Mailchimp or Gmail.]

---
## Google Ad Copy — 3 Variants

**Variant A — Offer-led**
Headline 1: [Max 30 chars]
Headline 2: [Max 30 chars]
Description: [Max 90 chars — includes location and main benefit]

**Variant B — Benefit-led**
Headline 1: [Max 30 chars]
Headline 2: [Max 30 chars]
Description: [Max 90 chars]

**Variant C — Local trust**
Headline 1: [Max 30 chars]
Headline 2: [Max 30 chars]
Description: [Max 90 chars]

---
## Review Request Templates

**SMS (under 160 chars):**
[Message — warm, personal, includes business name]

**Email:**
Subject: [Short subject]
[2-3 sentence body with a direct review link placeholder]

---
## Google Business Profile — 5 Quick Wins
1. [Specific actionable change — e.g., "Add 'emergency' to your business description"]
2. [Specific tip]
3. [Specific tip]
4. [Specific tip]
5. [Specific tip]`

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { business, location, services, customer, promo, email: bodyEmail } = body

  if (!business || !location || !services) {
    return Response.json({ error: 'business, location, and services are required' }, { status: 400 })
  }

  const redis = getRedis()
  const ip = getIp(req)

  const cookie = req.headers.get('cookie') || ''
  const sessionMatch = cookie.match(/i2l_session=([a-f0-9]+)/)
  if (sessionMatch && redis) {
    const sessionEmail = await redis.get(`session:${sessionMatch[1]}`)
    if (sessionEmail) return stream(business, location, services, customer, promo)
  }

  let extraHeaders: Record<string, string> = {}

  if (redis) {
    const key = bodyEmail ? `grow:email:${bodyEmail.toLowerCase()}` : `grow:ip:${ip}`
    const limit = bodyEmail ? EMAIL_LIMIT : FREE_LIMIT
    const count = Number(await redis.get(key)) || 0

    if (count >= limit) {
      return Response.json({ error: 'limit_reached', limit, email: !!bodyEmail }, { status: 429 })
    }

    if (!bodyEmail && count === FREE_LIMIT - 1) {
      extraHeaders['X-Free-Remaining'] = '0'
    }

    await redis.incr(key)
    await redis.expire(key, 60 * 60 * 24 * 30)

    if (bodyEmail) {
      await redis.set(`lead:${bodyEmail.toLowerCase()}`, JSON.stringify({
        email: bodyEmail,
        capturedAt: Date.now(),
        source: 'grow',
      }), { ex: 60 * 60 * 24 * 365 })
    }
  }

  return stream(business, location, services, customer, promo, extraHeaders)
}

function stream(
  business: string,
  location: string,
  services: string,
  customer: string,
  promo: string,
  extraHeaders: Record<string, string> = {}
) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return Response.json({ error: 'AI service not configured' }, { status: 503 })

  const openai = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })

  const userMessage = `Business: ${business}
Location: ${location}
Services: ${services}
Target customer: ${customer || 'local residents and homeowners'}${promo ? `\nCurrent promotion: ${promo}` : ''}

Generate my complete 30-day marketing kit now.`

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const s = await openai.chat.completions.create({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }],
          stream: true,
          max_tokens: 12000,
        })
        for await (const chunk of s) {
          const text = chunk.choices[0]?.delta?.content || ''
          if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: { text } })}\n\n`))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...extraHeaders },
  })
}
