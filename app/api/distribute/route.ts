export const runtime = 'edge'
import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

const FREE_LIMIT = 1
const EMAIL_LIMIT = 10

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

const SYSTEM_PROMPT = `You are a distribution strategist for founders and marketers. You operate as four roles simultaneously: researcher (maps where attention already lives and extracts exact audience language), storyteller (builds the narrative frame and hooks), media operator (assigns tactics per channel), and community builder (identifies where the tribe gathers).

Your job is to take one idea and output a complete, ready-to-deploy distribution system. Be surgical and specific — no generic advice, no filler. Every line must be usable today.

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS (use these exact section headers with ---):

---
## DISTRIBUTION MAP

For each channel: name it, specify exactly where (not "social media" — the specific subreddit, group, publication, podcast category, hashtag, community), and give one concrete tactic to execute this week.

Channel 1: [Name]
Where: [Specific — e.g. r/entrepeneurship, ProductHunt, Morning Brew newsletter, The Tim Ferriss Show listeners, #buildinpublic on Twitter/X]
Tactic: [One action to take this week — not a category, an action]

Channel 2: [Name]
Where: [Specific]
Tactic: [Specific action]

Channel 3: [Name]
Where: [Specific]
Tactic: [Specific action]

Channel 4: [Name]
Where: [Specific]
Tactic: [Specific action]

Channel 5: [Name]
Where: [Specific]
Tactic: [Specific action]

Channel 6: [Name]
Where: [Specific]
Tactic: [Specific action]

---
## AUDIENCE VOICE

These are the exact phrases your audience types into Google, says to a friend, or posts in a community when they're frustrated with the old way. Use these words verbatim — not paraphrased — in your hooks and content.

1. "[exact phrase — sounds like a real person talking]"
2. "[exact phrase]"
3. "[exact phrase]"
4. "[exact phrase]"
5. "[exact phrase]"
6. "[exact phrase]"
7. "[exact phrase]"
8. "[exact phrase]"

---
## NARRATIVE FRAME

[Two sentences that run through everything. Sentence one: the enemy or the old, broken way. Sentence two: what your idea makes possible instead. This is the spine that connects every hook to every channel.]

---
## 20 HOOKS

Each hook must stop a scroll. Every one is specific to this idea — zero generic templates. Platform label tells you where to post it first.

Hook 1 | Curiosity Gap | Twitter/X
[Opens a gap the reader can't close without reading more. Under 280 chars. Ends with a tease, not an answer.]

Hook 2 | Curiosity Gap | LinkedIn
[Same gap mechanic but longer — 2-3 sentences. Lead with a surprising setup, withhold the resolution.]

Hook 3 | Counter-Narrative | Twitter/X
[Challenges something everyone in this space believes. Confident. Slightly provocative. Under 280 chars.]

Hook 4 | Counter-Narrative | LinkedIn
[Same contrarian take with professional stakes explained. 2-3 sentences.]

Hook 5 | Confession | Twitter/X
[First-person. "I used to [wrong belief] until..." or "Nobody told me that..." Vulnerable but punchy. Under 280 chars.]

Hook 6 | Confession | LinkedIn
[Same confession but with context and stakes — what you lost because of the wrong belief. 2-3 sentences.]

Hook 7 | Hot Take | Twitter/X
[Bold opinion that splits the room. Some will agree loudly, some will argue. Under 280 chars.]

Hook 8 | Hot Take | LinkedIn
[Same hot take with one line of reasoning — why you believe it even if others don't. 2-3 sentences.]

Hook 9 | Data / Stat | Twitter/X
[Lead with a number that reframes how people think about the problem. Under 280 chars.]

Hook 10 | Data / Stat | LinkedIn
[Number first, then one sentence of what it means for this specific audience. 2 sentences.]

Hook 11 | Before / After | Twitter/X
[Vivid contrast between old situation and new. Parallel structure. Under 280 chars.]

Hook 12 | Before / After | LinkedIn
[Same contrast with a professional transformation angle. 2-3 sentences.]

Hook 13 | Myth Bust | Twitter/X
["Everyone says [wrong thing]. Here's what actually [works/happens]." Under 280 chars.]

Hook 14 | Myth Bust | LinkedIn
[Bust the myth and explain the cost of believing it. 2-3 sentences.]

Hook 15 | How-To | Twitter/X
["How to [specific outcome] without [specific pain]." Under 280 chars. The outcome and pain must be precise.]

Hook 16 | How-To | LinkedIn
[Same how-to structure but framed for professional context. 2 sentences.]

Hook 17 | List | Twitter/X
[Open with a strong numbered tease: "3 things that..." or "5 reasons why..." Under 280 chars.]

Hook 18 | List | LinkedIn
[Numbered list with a short narrative opener. 3-5 items, 1 sentence each.]

Hook 19 | Personal Story | Twitter/X
[Drop directly into a specific moment. Not "I want to tell you about..." — start at the scene. Under 280 chars.]

Hook 20 | Personal Story | LinkedIn
[Same scene-drop but with a lesson or question at the end that ties it to the audience. 3-4 sentences.]`

function buildUserMessage(idea: string): string {
  return `The idea: ${idea}

Build my complete distribution system now. Be hyper-specific to this exact idea.`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { idea, email: bodyEmail } = body

  if (!idea?.trim()) return Response.json({ error: 'idea required' }, { status: 400 })

  const redis = getRedis()
  const ip = getIp(req)

  const cookie = req.headers.get('cookie') || ''
  const sessionMatch = cookie.match(/i2l_session=([a-f0-9]+)/)
  if (sessionMatch && redis) {
    const sessionEmail = await redis.get(`session:${sessionMatch[1]}`)
    if (sessionEmail) return streamResponse(idea)
  }

  let extraHeaders: Record<string, string> = {}

  if (redis) {
    const key = bodyEmail
      ? `distribute:email:${bodyEmail.toLowerCase()}`
      : `distribute:ip:${ip}`
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
        source: 'distribute',
      }), { ex: 60 * 60 * 24 * 365 })
    }
  }

  return streamResponse(idea, extraHeaders)
}

function streamResponse(idea: string, extraHeaders: Record<string, string> = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return Response.json({ error: 'AI service not configured' }, { status: 503 })

  const openai = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const s = await openai.chat.completions.create({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserMessage(idea) },
          ],
          stream: true,
          max_tokens: 8000,
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
