export const runtime = 'edge'
import { fal } from '@fal-ai/client'
import { getRedis } from '@/app/lib/redis'

const MODEL = 'fal-ai/kling-video/v1.6/standard/text-to-video'

function buildPrompt(vision: string, tagline: string, productName: string): string {
  const name = productName || 'a digital product'
  const core = vision?.slice(0, 220) || tagline || `${name} — solving a real problem elegantly`
  return `Cinematic product concept reveal for ${name}. ${core}. Style: clean editorial, soft studio lighting, shallow depth of field. Camera: slow push-in from wide to medium close-up, subtle rack focus. Motion: smooth, unhurried — one cohesive 5-second moment. Mood: confident, minimal, world-class. No text overlays. No people. Abstract visual metaphor for the product's core idea. Photorealistic, 16:9, cinematic color grade.`
}

export async function POST(req: Request) {
  try {
    const { vision, tagline, productName, email } = await req.json()
    if (!vision && !tagline && !productName) {
      return Response.json({ error: 'At least one brief field required' }, { status: 400 })
    }
    const apiKey = process.env.FAL_KEY
    if (!apiKey) return Response.json({ error: 'Video generation not configured' }, { status: 503 })

    fal.config({ credentials: apiKey })

    const prompt = buildPrompt(vision, tagline, productName)
    const { request_id } = await fal.queue.submit(MODEL, {
      input: { prompt, duration: '5', aspect_ratio: '16:9' },
    })

    if (!request_id) return Response.json({ error: 'No request_id from fal.ai' }, { status: 502 })

    if (email) {
      const redis = getRedis()
      if (redis) await redis.set(`video:email:${request_id}`, email, { ex: 60 * 60 * 24 * 7 })
    }

    return Response.json({ task_id: request_id, status: 'pending' }, { status: 202 })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
