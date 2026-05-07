// app/api/video/generate/route.ts
export const runtime = 'edge'

function buildPrompt(vision: string, tagline: string, productName: string): string {
  const name = productName || 'a digital product'
  const core = vision?.slice(0, 220) || tagline || `${name} — solving a real problem elegantly`
  return `
Cinematic product concept reveal for ${name}.
${core}.
Style: clean editorial, soft studio lighting, shallow depth of field.
Camera: slow push-in from wide to medium close-up, subtle rack focus.
Motion: smooth, unhurried — one cohesive 5-second moment.
Mood: confident, minimal, world-class.
No text overlays. No people. Abstract visual metaphor for the product's core idea.
Photorealistic, 16:9, cinematic color grade.
  `.trim()
}

export async function POST(req: Request) {
  try {
    const { vision, tagline, productName } = await req.json()
    if (!vision && !tagline && !productName) {
      return Response.json({ error: 'At least one brief field required' }, { status: 400 })
    }
    const apiKey = process.env.PIAPI_KEY
    if (!apiKey) return Response.json({ error: 'Video generation not configured' }, { status: 503 })
    const prompt = buildPrompt(vision, tagline, productName)
    const res = await fetch('https://api.piapi.ai/api/v1/task', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kling',
        task_type: 'video_generation',
        input: {
          prompt,
          negative_prompt: 'text overlay, watermark, logo, people, faces, distorted, blurry',
          cfg_scale: 0.5,
          duration: 5,
          aspect_ratio: '16:9',
          mode: 'std',
        },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('PiAPI error:', err)
      return Response.json({ error: 'Video service unavailable' }, { status: 502 })
    }
    const data = await res.json()
    if (data.code !== 200) {
      return Response.json({ error: data.message || 'Generation failed' }, { status: 502 })
    }
    return Response.json({ task_id: data.data.task_id, status: 'pending' }, { status: 202 })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
