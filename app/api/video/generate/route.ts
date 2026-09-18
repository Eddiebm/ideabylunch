export const runtime = 'edge'
import { NextRequest } from 'next/server'
import { fal } from '@fal-ai/client'
import { getRedis } from '@/app/lib/redis'

const MODEL = 'fal-ai/kling-video/v1.6/standard/text-to-video'

// Video generation submits a paid fal.ai (Kling) job per request — the
// costliest of the three routes, so keep the free tier tight. Same
// rate-limit mechanism as /api/generate.
const FREE_LIMIT = 1
const EMAIL_LIMIT = 3

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

function buildPrompt(vision: string, tagline: string, productName: string): string {
  const name = productName || 'a digital product'
  const core = vision?.slice(0, 220) || tagline || `${name} — solving a real problem elegantly`
  return `Cinematic product concept reveal for ${name}. ${core}. Style: clean editorial, soft studio lighting, shallow depth of field. Camera: slow push-in from wide to medium close-up, subtle rack focus. Motion: smooth, unhurried — one cohesive 5-second moment. Mood: confident, minimal, world-class. No text overlays. No people. Abstract visual metaphor for the product's core idea. Photorealistic, 16:9, cinematic color grade.`
}

export async function POST(req: NextRequest) {
  try {
    const { vision, tagline, productName, email } = await req.json()
    if (!vision && !tagline && !productName) {
      return Response.json({ error: 'At least one brief field required' }, { status: 400 })
    }
    const apiKey = process.env.FAL_KEY
    if (!apiKey) return Response.json({ error: 'Video generation not configured' }, { status: 503 })

    const redis = getRedis()
    const ip = getIp(req)

    // Check session cookie for logged-in customers (unlimited)
    let isPayingSession = false
    const cookie = req.headers.get('cookie') || ''
    const sessionMatch = cookie.match(/i2l_session=([a-f0-9]+)/)
    if (sessionMatch && redis) {
      const sessionEmail = await redis.get(`session:${sessionMatch[1]}`)
      if (sessionEmail) isPayingSession = true
    }

    if (!isPayingSession && redis) {
      const key = email
        ? `video:email:${email.toLowerCase()}`
        : `video:ip:${ip}`
      const limit = email ? EMAIL_LIMIT : FREE_LIMIT
      const count = Number(await redis.get(key)) || 0

      if (count >= limit) {
        return Response.json(
          { error: 'limit_reached', limit, email: !!email },
          { status: 429 }
        )
      }

      await redis.incr(key)
      await redis.expire(key, 60 * 60 * 24 * 30) // 30-day rolling window

      if (email) {
        await redis.set(`lead:${email.toLowerCase()}`, JSON.stringify({
          email,
          capturedAt: Date.now(),
          source: 'video_generator',
        }), { ex: 60 * 60 * 24 * 365 })
      }
    }

    fal.config({ credentials: apiKey })

    const prompt = buildPrompt(vision, tagline, productName)
    const { request_id } = await fal.queue.submit(MODEL, {
      input: { prompt, duration: '5', aspect_ratio: '16:9' },
    })

    if (!request_id) return Response.json({ error: 'No request_id from fal.ai' }, { status: 502 })

    if (email && redis) {
      await redis.set(`video:email:${request_id}`, email, { ex: 60 * 60 * 24 * 7 })
    }

    return Response.json({ task_id: request_id, status: 'pending' }, { status: 202 })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
