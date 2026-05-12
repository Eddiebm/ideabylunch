export const runtime = 'edge'
import { put } from '@vercel/blob'
import { Resend } from 'resend'
import { getRedis } from '@/app/lib/redis'

async function persistToBlob(piapiUrl: string, taskId: string): Promise<string | null> {
  try {
    const videoRes = await fetch(piapiUrl)
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
  const apiKey = process.env.PIAPI_KEY
  if (!apiKey) return Response.json({ error: 'Not configured' }, { status: 503 })

  try {
    // Fast path: already persisted
    const redis = getRedis()
    if (redis) {
      const cached = await redis.get<string>(`video:blob:${task_id}`)
      if (cached) return Response.json({ task_id, status: 'complete', video_url: cached })
    }

    const res = await fetch(`https://api.piapi.ai/api/v1/task/${task_id}`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) return Response.json({ error: `Poll failed: ${res.status}` }, { status: 502 })
    const data = await res.json()
    if (data.code !== 200) return Response.json({ error: 'Poll error' }, { status: 502 })

    const piStatus: string = data.data?.status

    if (piStatus !== 'completed') {
      const status = piStatus === 'failed' ? 'failed' : piStatus === 'processing' ? 'processing' : 'pending'
      return Response.json({ task_id, status, video_url: null })
    }

    const piapiUrl: string | null = data.data?.output?.works?.[0]?.resource?.resource || null
    if (!piapiUrl) return Response.json({ task_id, status: 'failed', video_url: null })

    // Persist to Vercel Blob
    const blobUrl = process.env.BLOB_READ_WRITE_TOKEN
      ? await persistToBlob(piapiUrl, task_id)
      : null
    const video_url = blobUrl ?? piapiUrl

    if (redis) {
      // Cache blob URL (or piapi URL if blob unavailable) for 1 year
      await redis.set(`video:blob:${task_id}`, video_url, { ex: 60 * 60 * 24 * 365 })

      // Index by email for deploy-time lookup
      const email = await redis.get<string>(`video:email:${task_id}`)
      if (email) {
        await redis.set(`video:by_email:${email}`, video_url, { ex: 60 * 60 * 24 * 90 })

        // Send notification email exactly once
        const alreadyNotified = await redis.set(`video:notified:${task_id}`, '1', {
          ex: 60 * 60 * 24 * 7,
          nx: true, // only set if not exists — atomic dedup
        })
        if (alreadyNotified) {
          await sendVideoEmail(email, video_url).catch(() => {})
        }
      }
    }

    return Response.json({ task_id, status: 'complete', video_url })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
