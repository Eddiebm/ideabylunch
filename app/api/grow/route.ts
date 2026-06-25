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

const SYSTEM_PROMPTS: Record<string, string> = {
  kit: `You are a world-class marketing director for local small businesses. Generate a complete, ready-to-use 30-day marketing kit. Be hyper-specific to the exact business and location — no generic filler. Every piece of content must be copy-pasteable and ready to use today.

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
1. [Specific actionable change]
2. [Specific tip]
3. [Specific tip]
4. [Specific tip]
5. [Specific tip]`,

  review: `You are a customer service expert for local small businesses. Write a professional, warm response to the customer review provided.

Rules:
- Positive review: thank them warmly, use their name if given, reference a specific detail they praised, invite them back
- Negative review: stay calm, acknowledge their experience without admitting fault, offer to resolve offline, never argue or get defensive
- Under 100 words
- Sound like a real person, not a corporate template
- End with the business owner's name and business name

Output only the response text, ready to paste into Google/Yelp.`,

  proposal: `You are a professional proposal writer for local service businesses. Create a clean, complete quote/proposal document.

FORMAT:
---
## [Business Name] — Project Proposal

**Prepared for:** [Customer name]
**Date:** [Today]
**Valid for:** 30 days

---
## Scope of Work
[Clear itemized list of exactly what will be done]

---
## Investment
[Itemized pricing breakdown — line items where possible]
**Total: $[amount]**

---
## Timeline
[Realistic start date, completion estimate, key milestones]

---
## What's Included
- [Item]
- [Item]

## What's Not Included
- [Item — so there are no surprises]

---
## Next Steps
[Simple 1-2-3 to accept and get started]

---
## Terms
- [Payment schedule]
- [Change order policy]
- [Warranty/guarantee if applicable]

---

Sound confident and professional. The client should feel they're working with a serious, trustworthy business.`,

  reengage: `You are an email marketing expert for local small businesses. Write a warm, personal re-engagement campaign for customers who haven't booked in a while.

FORMAT:
---
## Re-engagement Email

Subject: [Under 50 chars — curiosity or FOMO, not generic]

[150-200 word email. Personal, conversational, sounds like the owner wrote it. Mention it's been a while. Include a specific offer or reason to come back. One clear CTA.]

---
## SMS Version (under 160 chars)
[Direct, warm, includes business name and offer]

---
## WhatsApp Broadcast Message
[Slightly warmer than SMS, 2-3 sentences, ends with a question to encourage reply]

---
## Follow-up Email (send 5 days later if no response)

Subject: [Short, creates mild urgency]

[100-word follow-up. Acknowledge the previous message. Add social proof or a deadline. Keep it light, not pushy.]`,

  seasonal: `You are a marketing director for local small businesses. Create a complete seasonal marketing campaign that drives real bookings and sales.

FORMAT:
---
## Seasonal Campaign: [Season/Occasion] — [Business Name]

---
## 10 Social Posts

Post 1 | [Platform]
[Caption + hashtags]

[Continue for all 10 — mix announcement, countdown, offer, tip, customer appreciation, behind-the-scenes]

---
## Promotional Email

Subject: [Seasonal subject line]

[Full 150-word email — seasonal angle, specific offer, CTA]

---
## SMS Blast (under 160 chars)
[Short, punchy, includes offer and expiry]

---
## Seasonal Offer Ideas
1. [Specific offer tied to the season — discount, bundle, or experience]
2. [Alternative offer idea]

---
## Campaign Calendar
[When to post/send each piece for maximum impact — specific days]`,

  hiring: `You are an HR copywriter for small businesses that want to attract quality candidates who are excited to work there.

FORMAT:
---
## Instagram / Facebook Post
[Eye-catching, shows personality and culture, specific about the role, ends with how to apply]

---
## LinkedIn Post
[Professional but not stiff. Lead with what makes this company worth joining. Clear on requirements. 150-200 words.]

---
## Indeed / Job Board Listing

**[Job Title] — [Business Name], [Location]**

**About us:**
[2-3 sentences about the business and what makes it a great place to work]

**What you'll do:**
- [Responsibility]
- [Responsibility]
- [Responsibility]
- [Responsibility]
- [Responsibility]

**What we're looking for:**
- [Must-have requirement]
- [Must-have]
- [Nice-to-have]

**What we offer:**
- [Compensation/wage]
- [Benefit or perk]
- [Benefit or perk]

**How to apply:**
[Simple instructions — email, DM, walk-in, etc.]

Write like a company people actually want to work for — specific, human, honest.`,

  'price-increase': `You are a business communication expert. Write a confident, professional price increase communication package. Never over-apologize — frame it as a commitment to quality and fair business.

FORMAT:
---
## Email to Existing Customers

Subject: [Professional, direct — don't bury the lead]

[150-200 word email. Acknowledge the relationship, announce the change clearly, give effective date, briefly explain why (better materials/staff/quality), offer to answer questions. Warm but confident.]

---
## SMS Notification (under 160 chars)
[Brief, professional, includes effective date]

---
## Social Media Post (optional announcement)
[2-3 sentences — transparent, positive framing. Not required but some businesses like to post it.]

---
## FAQ for Your Team (3 questions)

**Q: Why is the price going up?**
A: [Confident, honest answer they can give customers]

**Q: Can I lock in my current rate?**
A: [Options to offer or decline gracefully]

**Q: Is this permanent?**
A: [Honest answer]`,
}

function buildUserMessage(tool: string, fields: Record<string, string>): string {
  switch (tool) {
    case 'kit':
      return `Business: ${fields.business}
Location: ${fields.location}
Services: ${fields.services}
Target customer: ${fields.customer || 'local residents'}${fields.promo ? `\nCurrent promotion: ${fields.promo}` : ''}

Generate my complete 30-day marketing kit now.`

    case 'review':
      return `Business: ${fields.business} (${fields.businessType || 'local business'})
Review text: "${fields.reviewText}"${fields.stars ? `\nStar rating: ${fields.stars} stars` : ''}

Write my professional response.`

    case 'proposal':
      return `Business: ${fields.business}
Customer name: ${fields.customerName}
Job description: ${fields.jobDescription}
Total price: $${fields.price}${fields.timeline ? `\nTimeline: ${fields.timeline}` : ''}

Write my professional proposal.`

    case 'reengage':
      return `Business: ${fields.business}
Location: ${fields.location || ''}
Services: ${fields.services}
${fields.offer ? `Special offer to include: ${fields.offer}` : 'Come up with a compelling reason to come back.'}

Write my re-engagement campaign.`

    case 'seasonal':
      return `Business: ${fields.business}
Location: ${fields.location}
Services: ${fields.services}
Season/Occasion: ${fields.season}${fields.offer ? `\nPromotion idea: ${fields.offer}` : ''}

Write my seasonal campaign.`

    case 'hiring':
      return `Business: ${fields.business}
Location: ${fields.location}
Role: ${fields.role}
${fields.requirements ? `Requirements/notes: ${fields.requirements}` : ''}
${fields.wage ? `Compensation: ${fields.wage}` : ''}

Write my hiring content.`

    case 'price-increase':
      return `Business: ${fields.business}
Current price: $${fields.oldPrice}
New price: $${fields.newPrice}
Effective date: ${fields.effectiveDate}
${fields.reason ? `Reason: ${fields.reason}` : ''}

Write my price increase communication.`

    default:
      return JSON.stringify(fields)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tool = 'kit', email: bodyEmail, ...fields } = body

  const systemPrompt = SYSTEM_PROMPTS[tool]
  if (!systemPrompt) return Response.json({ error: 'unknown tool' }, { status: 400 })

  const redis = getRedis()
  const ip = getIp(req)

  const cookie = req.headers.get('cookie') || ''
  const sessionMatch = cookie.match(/i2l_session=([a-f0-9]+)/)
  if (sessionMatch && redis) {
    const sessionEmail = await redis.get(`session:${sessionMatch[1]}`)
    if (sessionEmail) return streamResponse(systemPrompt, buildUserMessage(tool, fields))
  }

  // Grow subscribers get unlimited
  if (redis && bodyEmail) {
    const isSubscriber = await redis.get(`grow:subscriber:${bodyEmail.toLowerCase()}`)
    if (isSubscriber) return streamResponse(systemPrompt, buildUserMessage(tool, fields))
  }

  let extraHeaders: Record<string, string> = {}

  if (redis) {
    const key = bodyEmail
      ? `grow:${tool}:email:${bodyEmail.toLowerCase()}`
      : `grow:${tool}:ip:${ip}`
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
        source: `grow:${tool}`,
      }), { ex: 60 * 60 * 24 * 365 })
    }
  }

  return streamResponse(systemPrompt, buildUserMessage(tool, fields), extraHeaders)
}

function streamResponse(
  systemPrompt: string,
  userMessage: string,
  extraHeaders: Record<string, string> = {}
) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return Response.json({ error: 'AI service not configured' }, { status: 503 })

  const openai = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const s = await openai.chat.completions.create({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
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
