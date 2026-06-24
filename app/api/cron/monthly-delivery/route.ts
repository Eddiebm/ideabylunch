export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'
import { Resend } from 'resend'
import OpenAI from 'openai'

type Profile = {
  email: string
  business: string
  businessType: string
  location: string
  services: string
  customer: string
}

const SYSTEM_PROMPT = `You are a world-class marketing director for local small businesses. Generate a ready-to-use monthly marketing kit. Be hyper-specific to this exact business and location — no generic filler. Every piece of content must be copy-pasteable today.

FORMAT EXACTLY AS FOLLOWS:

---
## 10 Social Media Posts

Post 1 | Day 1 | Instagram
[Caption — 2-3 punchy sentences specific to this business. End with a question or CTA.]
Hashtags: #[relevant] #[location] #[industry]

[Continue for all 10 posts. Vary platforms. Vary content types: tip, offer, behind-the-scenes, customer win, FAQ.]

---
## Monthly Customer Email

Subject: [Compelling subject line under 50 chars]

[Full email body — 150 words. Warm, direct. Include a specific offer or update. One clear CTA.]

---
## Google Ad Copy

Headline 1: [Max 30 chars]
Headline 2: [Max 30 chars]
Description: [Max 90 chars — includes location and main benefit]

---
## This Month's Quick Win

[One specific, actionable thing to do this month to get more customers — tied directly to their business type and location.]`

function buildUserMessage(p: Profile): string {
  return `Business: ${p.business}
Type: ${p.businessType || 'local business'}
Location: ${p.location}
Services: ${p.services}
Target customer: ${p.customer || 'local residents'}

Generate my monthly marketing kit.`
}

async function generateKit(profile: Profile): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing')

  const openai = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })
  const completion = await openai.chat.completions.create({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserMessage(profile) },
    ],
    max_tokens: 6000,
  })
  return completion.choices[0]?.message?.content || ''
}

function kitToHtml(kit: string, profile: Profile, monthLabel: string): string {
  const escaped = kit
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const body = escaped
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #E5E5EA;margin:24px 0">')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:700;color:#1C1C1E;margin:20px 0 12px">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#000;padding:28px 32px">
      <div style="font-size:22px;font-weight:700;color:#fff">IdeaByLunch</div>
      <div style="font-size:14px;color:#AEAEB2;margin-top:4px">${monthLabel} Marketing Kit — ${profile.business}</div>
    </div>
    <div style="padding:28px 32px;color:#3C3C43;font-size:15px;line-height:1.7">
      <p style="margin:0 0 20px">Hi there — here's your <strong>${monthLabel} marketing kit</strong> for <strong>${profile.business}</strong>. Everything below is ready to copy and use today.</p>
      ${body}
      <div style="margin-top:32px;padding:20px;background:#F9F9FB;border-radius:12px;text-align:center">
        <div style="font-size:13px;color:#6E6E73;margin-bottom:12px">Want unlimited kits, all 7 tools, and more?</div>
        <a href="https://ideabylunch.com/grow" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:11px 24px;border-radius:8px;font-size:14px;font-weight:600">Upgrade to Grow — $49/mo →</a>
      </div>
    </div>
    <div style="padding:16px 32px;background:#F9F9FB;border-top:1px solid #E5E5EA;font-size:12px;color:#AEAEB2;text-align:center">
      IdeaByLunch · <a href="https://ideabylunch.com/grow" style="color:#AEAEB2">Manage your profile</a> · You're receiving this because you saved your business profile on IdeaByLunch Grow.
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return Response.json({ error: 'RESEND_API_KEY missing' }, { status: 503 })

  const resend = new Resend(resendKey)
  const from = process.env.RESEND_FROM || 'IdeaByLunch Grow <hello@ideabylunch.com>'

  const now = new Date()
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const subscribers: string[] = await redis.smembers('grow:delivery:subscribers')
  if (!subscribers.length) return Response.json({ ok: true, sent: 0, skipped: 0 })

  const results = await Promise.allSettled(
    subscribers.map(async (email) => {
      const alreadySent = await redis.get(`grow:delivered:${monthKey}:${email}`)
      if (alreadySent) return { email, status: 'skipped' }

      const raw = await redis.get(`grow:profile:${email}`)
      if (!raw) return { email, status: 'no_profile' }

      const profile: Profile = typeof raw === 'string' ? JSON.parse(raw) : raw

      const kit = await generateKit(profile)
      if (!kit) throw new Error('empty kit')

      await resend.emails.send({
        from,
        to: email,
        subject: `Your ${monthLabel} marketing kit — ${profile.business}`,
        html: kitToHtml(kit, profile, monthLabel),
      })

      await redis.set(`grow:delivered:${monthKey}:${email}`, '1', { ex: 60 * 60 * 24 * 35 })
      return { email, status: 'sent' }
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.status === 'sent').length
  const skipped = results.filter(r => r.status === 'fulfilled' && (r.value as any)?.status !== 'sent').length
  const failed = results.filter(r => r.status === 'rejected').length

  // Notify Eddie of delivery run
  await resend.emails.send({
    from,
    to: process.env.ADMIN_EMAIL || 'eddie@bannermanmenson.com',
    subject: `Grow monthly delivery — ${monthLabel}: ${sent} sent, ${failed} failed`,
    html: `<p><strong>${monthLabel} delivery complete.</strong><br>Sent: ${sent} / Failed: ${failed} / Skipped (already sent): ${skipped}<br>Total subscribers: ${subscribers.length}</p>`,
  }).catch(() => {})

  return Response.json({ ok: true, sent, failed, skipped, total: subscribers.length })
}
