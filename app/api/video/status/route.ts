export const runtime = 'edge'
import { put } from '@vercel/blob'
import { Resend } from 'resend'
import { getRedis } from '@/app/lib/redis'

const FAL_MODEL = 'fal-ai/kling-video/v1.6/standard/text-to-video'

async function persistToBlob(videoUrl: string, taskId: string): Promise<string | null> {
  try {
    const videoRes = await fetch(videoUrl)
    if (!videoRes.ok) return null
    const blob = await put(`concepts/${taskId}.mp4`, videoRes.body!, {
      access: 'public',
      contentType: 'video/mp4',
    })
    return blob.url
  } catch (e) {
    console.error('Blob upload failed:', e)
    return null
  }
}

async function sendVideoEmail(email: string, blobUrl: string, productName?: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return
  const resend = new Resend(resendKey)
  const from = process.env.RESEND_FROM || 'IdeaByLunch <hello@ideabylunch.com>'
  const embedCode = `<video src="${blobUrl}" autoplay loop muted playsinline style="width:100%"></video>`
  await resend.emails.send({
    from,
    to: email,
    subject: `Your concept video is ready${productName ? ` — ${productName}` : ''}`,
    html: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
  <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1D1D1F">Your concept video is ready</h2>
  <p style="margin:0 0 24px;color:#6E6E73;font-size:15px;line-height:1.5">Here's your permanent link — it won't expire.</p>
  <a href="${blobUrl}" style="display:block;background:#0066CC;color:#fff;text-decoration:none;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600;text-align:center;margin-bottom:24px">Watch your concept video →</a>
  <div style="background:#F2F2F7;border-radius:10px;padding:12px 16px;font-size:13px;color:#6E6E73">
    <strong style="color:#1D1D1F">Embed on your site:</strong><br>
    <code style="display:block;margin-top:6px;font-family:monospace;font-size:12px;word-break:break-all">${embedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
  </div>
  <p style="margin:24px 0 0;font-size:13px;color:#AEAEB2">Powered by IdeaByLunch · <a href="https://ideabylunch.com" style="color:#0066CC;text-decoration:none">ideabylunch.com</a></p>
</div>`,
  })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const task_id = searchParams.get('task_id')
  if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 })
  const apiKey = process.env.FAL_KEY
  if (!apiKey) return Response.json({ error: 'Not configured' }, { status: 503 })

  try {
    const redis = getRedis()
    if (redis) {
      const cached = await redis.get<string>(`video:blob:${task_id}`)
      if (cached) return Response.json({ task_id, status: 'complete', video_url: cached })
    }

    const statusRes = await fetch(
      `https://queue.fal.run/${FAL_MODEL}/requests/${task_id}/status`,
      { headers: { Authorization: `Key ${apiKey}` } },
    )
    if (!statusRes.ok) return Response.json({ error: `Poll failed: ${statusRes.status}` }, { status: 502 })
    const { status: falStatus } = await statusRes.json() as { status: string }

    if (falStatus === 'FAILED') return Response.json({ task_id, status: 'failed', video_url: null })
    if (falStatus !== 'COMPLETED') {
      const status = falStatus === 'IN_PROGRESS' ? 'processing' : 'pending'
      return Response.json({ task_id, status, video_url: null })
    }

    const resultRes = await fetch(
      `https://queue.fal.run/${FAL_MODEL}/requests/${task_id}`,
      { headers: { Authorization: `Key ${apiKey}` } },
    )
    if (!resultRes.ok) return Response.json({ task_id, status: 'failed', video_url: null })
    const result = await resultRes.json() as { video?: { url: string } }
    const falUrl = result.video?.url
    if (!falUrl) return Response.json({ task_id, status: 'failed', video_url: null })

    const blobUrl = process.env.BLOB_READ_WRITE_TOKEN
      ? await persistToBlob(falUrl, task_id)
      : null
    const video_url = blobUrl ?? falUrl

    if (redis) {
      await redis.set(`video:blob:${task_id}`, video_url, { ex: 60 * 60 * 24 * 365 })
      const email = await redis.get<string>(`video:email:${task_id}`)
      if (email) {
        await redis.set(`video:by_email:${email}`, video_url, { ex: 60 * 60 * 24 * 90 })
        const alreadyNotified = await redis.set(`video:notified:${task_id}`, '1', {
          ex: 60 * 60 * 24 * 7,
          nx: true,
        })
        if (alreadyNotified) await sendVideoEmail(email, video_url).catch(() => {})
      }
    }

    return Response.json({ task_id, status: 'complete', video_url })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
