import { Resend } from 'resend'
import { getRedis } from '@/app/lib/redis'

export const runtime = 'nodejs'

function generateToken(): string {
  const arr = new Uint8Array(24)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email || !email.includes('@')) {
      return Response.json({ error: 'Valid email required' }, { status: 400 })
    }

    const redis = getRedis()
    if (!redis) return Response.json({ error: 'Service unavailable' }, { status: 503 })

    // Check this email has an order
    const orderId = await redis.get(`customer:${email.toLowerCase()}:order`)
    if (!orderId) {
      return Response.json({ error: 'No account found for this email. Did you purchase a site?' }, { status: 404 })
    }

    const token = generateToken()
    await redis.set(`auth:token:${token}`, email.toLowerCase(), { ex: 900 }) // 15 min

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://idea2lunch.com'
    const link = `${appUrl}/api/auth/verify?token=${token}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: `idea2Lunch <${process.env.RESEND_FROM || 'hello@idea2lunch.com'}>`,
      to: email,
      subject: 'Your dashboard link',
      html: `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F2F2F7;padding:40px">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:32px">
          <h2 style="font-size:24px;font-weight:700;color:#1D1D1F;margin:0 0 8px">Dashboard access</h2>
          <p style="font-size:15px;color:#6E6E73;margin:0 0 24px">Click the button below to access your site dashboard. This link expires in 15 minutes.</p>
          <a href="${link}" style="display:inline-block;background:#1D1D1F;color:#fff;padding:12px 28px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none">Open my dashboard →</a>
          <p style="font-size:13px;color:#AEAEB2;margin:24px 0 0">If you didn't request this, ignore this email.</p>
        </div></body></html>`,
    })

    return Response.json({ ok: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
