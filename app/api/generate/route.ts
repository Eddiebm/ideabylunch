import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

const FREE_LIMIT = 2      // anonymous IP limit
const EMAIL_LIMIT = 7     // after email capture

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { systemPrompt, userMessage, email: bodyEmail } = body

  const redis = getRedis()
  const ip = getIp(req)

  // Check session cookie for logged-in customers (unlimited)
  const cookie = req.headers.get('cookie') || ''
  const sessionMatch = cookie.match(/i2l_session=([a-f0-9]+)/)
  if (sessionMatch && redis) {
    const sessionEmail = await redis.get(`session:${sessionMatch[1]}`)
    if (sessionEmail) {
      // Paying customer — no limit
      return stream(systemPrompt, userMessage)
    }
  }

  if (redis) {
    const key = bodyEmail
      ? `gen:email:${bodyEmail.toLowerCase()}`
      : `gen:ip:${ip}`

    const limit = bodyEmail ? EMAIL_LIMIT : FREE_LIMIT
    const count = Number(await redis.get(key)) || 0

    if (count >= limit) {
      return Response.json(
        { error: 'limit_reached', limit, email: !!bodyEmail },
        { status: 429 }
      )
    }

    await redis.incr(key)
    await redis.expire(key, 60 * 60 * 24 * 30) // 30-day rolling window

    // Store email as lead if provided
    if (bodyEmail) {
      await redis.set(`lead:${bodyEmail.toLowerCase()}`, JSON.stringify({
        email: bodyEmail,
        capturedAt: Date.now(),
        source: 'brief_generator',
      }), { ex: 60 * 60 * 24 * 365 })
    }
  }

  return stream(systemPrompt, userMessage)
}

function stream(systemPrompt: string, userMessage: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'user', content: userMessage },
  ]
  if (systemPrompt) messages.unshift({ role: 'system', content: systemPrompt })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const s = await openai.chat.completions.create({
          model: 'google/gemini-2.5-flash', messages, stream: true, max_tokens: 8000,
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
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
