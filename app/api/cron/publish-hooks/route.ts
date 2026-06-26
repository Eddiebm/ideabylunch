export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'
import { Resend } from 'resend'
import {
  getConn, setConn,
  postBluesky, postTwitter, postLinkedIn, postThreads,
  type BlueskyConn, type TwitterConn, type LinkedInConn, type ThreadsConn,
} from '@/app/lib/platform-connect'

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

function pColor(p: string) {
  const s = p.toLowerCase()
  if (s.includes('twitter') || s.includes('/x')) return '#000'
  if (s.includes('linkedin')) return '#0A66C2'
  if (s.includes('bluesky')) return '#0560FF'
  if (s.includes('threads')) return '#101010'
  return '#1D1D1F'
}

function pIcon(p: string) {
  const s = p.toLowerCase()
  if (s.includes('twitter') || s.includes('/x')) return '𝕏'
  if (s.includes('linkedin')) return 'in'
  if (s.includes('bluesky')) return '🦋'
  if (s.includes('threads')) return '🧵'
  return '📢'
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
  const twId = process.env.TWITTER_CLIENT_ID || ''
  const twSecret = process.env.TWITTER_CLIENT_SECRET || ''
  const liId = process.env.LINKEDIN_CLIENT_ID || ''
  const liSecret = process.env.LINKEDIN_CLIENT_SECRET || ''

  const emails = await redis.smembers('dist:queue:emails') as string[]
  let sent = 0
  const errors: string[] = []

  for (const email of emails) {
    try {
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
        const platform: string = hook.platform || ''
        const color = HOOK_COLORS[hook.type] || pColor(platform)
        const pl = platform.toLowerCase()

        // Auto-post if platform account is connected
        let autoPosted = false
        let autoError = ''

        try {
          if (pl.includes('bluesky')) {
            const conn = await getConn<BlueskyConn>(redis, email, 'bluesky')
            if (conn) {
              const result = await postBluesky(conn, hook.text)
              if (typeof result === 'string') {
                await setConn(redis, email, 'bluesky', { ...conn, refreshJwt: result })
                autoPosted = true
              } else {
                autoError = 'Bluesky session expired — reconnect your account'
              }
            }
          } else if (pl.includes('twitter') || pl.includes('/x')) {
            const conn = await getConn<TwitterConn>(redis, email, 'twitter')
            if (conn) {
              const r = await postTwitter(conn, hook.text, twId, twSecret)
              if (r.ok) {
                if (r.newTokens) await setConn(redis, email, 'twitter', { ...conn, ...r.newTokens })
                autoPosted = true
              } else {
                autoError = 'Twitter post failed — check API key status'
              }
            }
          } else if (pl.includes('linkedin')) {
            const conn = await getConn<LinkedInConn>(redis, email, 'linkedin')
            if (conn) {
              const r = await postLinkedIn(conn, hook.text, liId, liSecret)
              if (r.ok) {
                if (r.newTokens) await setConn(redis, email, 'linkedin', { ...conn, ...r.newTokens })
                autoPosted = true
              } else {
                autoError = 'LinkedIn post failed'
              }
            }
          } else if (pl.includes('threads')) {
            const conn = await getConn<ThreadsConn>(redis, email, 'threads')
            if (conn) {
              const r = await postThreads(conn, hook.text)
              if (r.ok) {
                if (r.newTokens) await setConn(redis, email, 'threads', { ...conn, ...r.newTokens })
                autoPosted = true
              } else {
                autoError = 'Threads post failed'
              }
            }
          }
        } catch (postErr) {
          autoError = String(postErr)
        }

        const isTwitter = pl.includes('twitter') || pl.includes('/x')
        const tweetUrl = isTwitter && !autoPosted ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(hook.text)}` : null

        await resend.emails.send({
          from,
          to: email,
          subject: autoPosted
            ? `✓ Auto-posted to ${platform} — Day ${day}/${total}`
            : `Day ${day}/${total} — Your ${hook.type || platform} post`,
          html: buildEmail({ appUrl, day, total, platform, color, hook, autoPosted, autoError, tweetUrl, email }),
        })

        hook.status = 'sent'
        hook.sentAt = now
        hook.autoPosted = autoPosted
        await redis.set(`dist:hook:${id}`, JSON.stringify(hook), { ex: 60 * 60 * 24 * 60 })
        sent++
      }
    } catch (err) {
      errors.push(`${email}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return Response.json({ sent, errors, total: emails.length })
}

function buildEmail({ appUrl, day, total, platform, color, hook, autoPosted, autoError, tweetUrl, email }: {
  appUrl: string; day: number; total: number; platform: string; color: string
  hook: any; autoPosted: boolean; autoError: string; tweetUrl: string | null; email: string
}) {
  const pc = pColor(platform)
  const pi = pIcon(platform)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="margin-bottom:24px;">
      <a href="${appUrl}" style="font-size:17px;font-weight:700;color:#1D1D1F;text-decoration:none;letter-spacing:-.3px;">IdeaByLunch</a>
    </div>
    <div style="font-size:12px;font-weight:700;color:#6E6E73;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;">Day ${day} of ${total}</div>

    ${autoPosted ? `<div style="background:#30D15818;border:1px solid #30D15840;border-radius:12px;padding:12px 16px;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:#1D9B4A;">✅ Auto-posted to ${platform}</div>
      <div style="font-size:12px;color:#6E6E73;margin-top:2px;">Published via your connected account — no action needed</div>
    </div>` : autoError ? `<div style="background:#FF375F18;border:1px solid #FF375F40;border-radius:12px;padding:12px 16px;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:700;color:#FF375F;">Auto-post failed — post manually below</div>
      <div style="font-size:12px;color:#6E6E73;margin-top:2px;">${autoError}</div>
    </div>` : ''}

    <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
        ${hook.type ? `<span style="font-size:11px;font-weight:700;color:${color};background:${color}18;padding:3px 10px;border-radius:5px;">${hook.type}</span>` : ''}
        <span style="font-size:12px;font-weight:700;color:${pc};background:${pc}14;padding:3px 10px;border-radius:5px;">${pi} ${platform}</span>
      </div>
      <p style="font-size:16px;color:#1D1D1F;line-height:1.65;margin:0;white-space:pre-wrap;">${hook.text}</p>
    </div>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
      ${tweetUrl ? `<a href="${tweetUrl}" style="background:#000;color:#fff;text-decoration:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;">Post on X →</a>` : ''}
      <a href="${appUrl}/distribute/queue?email=${encodeURIComponent(email)}" style="background:#F2F2F7;color:#1D1D1F;text-decoration:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;">View full queue →</a>
    </div>

    ${!autoPosted ? `<div style="background:#F2F2F7;border-radius:12px;padding:14px 16px;margin-bottom:20px;">
      <div style="font-size:12px;font-weight:700;color:#6E6E73;margin-bottom:6px;">Want this posted automatically next time?</div>
      <a href="${appUrl}/distribute/queue?email=${encodeURIComponent(email)}#connect" style="font-size:13px;color:#0071E3;font-weight:600;text-decoration:none;">Connect your ${platform} account →</a>
    </div>` : ''}

    ${hook.idea ? `<p style="font-size:13px;color:#AEAEB2;margin:0 0 16px;">Idea: <em>${hook.idea}</em></p>` : ''}
    <p style="font-size:12px;color:#AEAEB2;margin:0;">You're getting this because you scheduled a distribution system on <a href="${appUrl}/distribute" style="color:#AEAEB2;">IdeaByLunch</a>.</p>
  </div>
</body>
</html>`
}
