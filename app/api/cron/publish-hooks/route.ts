export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'
import { Resend } from 'resend'

const HOOK_COLORS: Record<string, string> = {
  'Curiosity Gap': '#0071E3',
  'Counter-Narrative': '#FF375F',
  'Confession': '#FF9F0A',
  'Hot Take': '#FF453A',
  'Data / Stat': '#30D158',
  'Before / After': '#5E5CE6',
  'Myth Bust': '#FF6B00',
  'How-To': '#00B4D8',
  'List': '#64D2FF',
  'Personal Story': '#BF5AF2',
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM || 'hello@ideabylunch.com'
  const now = Date.now()

  const emails = await redis.smembers('dist:queue:emails') as string[]
  let sent = 0
  const errors: string[] = []

  for (const email of emails) {
    try {
      // Get hooks due now or earlier that are still pending
      const dueIds = await redis.zrange(`dist:queue:${email}`, 0, now, { byScore: true }) as string[]
      if (!dueIds.length) continue

      for (const id of dueIds) {
        const raw = await redis.get(`dist:hook:${id}`)
        if (!raw) continue
        const hook = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (hook.status !== 'pending') continue

        const meta = await redis.get(`dist:meta:${email}`)
        const metaData = meta ? (typeof meta === 'string' ? JSON.parse(meta) : meta) : null
        const total = metaData?.total ?? 20
        const day = hook.num ?? 1
        const color = HOOK_COLORS[hook.type] || '#1D1D1F'
        const isTwitter = hook.platform?.toLowerCase().includes('twitter') || hook.platform?.toLowerCase().includes('x')
        const tweetUrl = isTwitter ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(hook.text)}` : null

        await resend.emails.send({
          from,
          to: email,
          subject: `Day ${day}/${total} — Your ${hook.type} hook`,
          html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="margin-bottom:24px;">
      <a href="https://ideabylunch.com" style="font-size:17px;font-weight:700;color:#1D1D1F;text-decoration:none;letter-spacing:-.3px;">IdeaByLunch</a>
    </div>

    <!-- Day badge -->
    <div style="font-size:12px;font-weight:700;color:#6E6E73;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;">
      Day ${day} of ${total}
    </div>

    <!-- Hook card -->
    <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        <span style="font-size:11px;font-weight:700;color:${color};background:${color}18;padding:3px 10px;border-radius:5px;letter-spacing:.04em;">${hook.type}</span>
        <span style="font-size:12px;color:#AEAEB2;font-weight:500;">${hook.platform}</span>
      </div>
      <p style="font-size:16px;color:#1D1D1F;line-height:1.65;margin:0;white-space:pre-wrap;">${hook.text}</p>
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
      ${tweetUrl ? `<a href="${tweetUrl}" style="background:#000;color:#fff;text-decoration:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;">Post on X →</a>` : ''}
      <a href="https://ideabylunch.com/distribute/queue?email=${encodeURIComponent(email)}" style="background:#F2F2F7;color:#1D1D1F;text-decoration:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;">View full queue →</a>
    </div>

    <!-- Idea context -->
    ${hook.idea ? `<p style="font-size:13px;color:#AEAEB2;margin:0 0 20px;">Idea: <em>${hook.idea}</em></p>` : ''}

    <!-- Footer -->
    <p style="font-size:12px;color:#AEAEB2;margin:0;">
      You're getting this because you scheduled a distribution system on <a href="https://ideabylunch.com/distribute" style="color:#AEAEB2;">IdeaByLunch</a>.
    </p>
  </div>
</body>
</html>`,
        })

        // Mark as sent
        hook.status = 'sent'
        hook.sentAt = now
        await redis.set(`dist:hook:${id}`, JSON.stringify(hook), { ex: 60 * 60 * 24 * 60 })
        sent++
      }
    } catch (err) {
      errors.push(`${email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return Response.json({ sent, errors, total: emails.length })
}
