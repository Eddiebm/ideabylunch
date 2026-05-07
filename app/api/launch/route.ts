export const runtime = 'nodejs'
import { Resend } from 'resend'

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  try {
    const { name, email, idea, brief, plan } = await req.json()

    // Email to you (Eddie)
    await resend.emails.send({
      from: 'IdeaByLunch <onboarding@resend.dev>',
      to: ['eddiebannerman@gmail.com'],
      subject: `🚀 New Launch Request — ${plan} — ${name}`,
      html: `
        <div style="font-family:monospace;max-width:600px;margin:0 auto;background:#0a0e1a;color:#e8ecf8;padding:32px;border-radius:8px">
          <h2 style="color:#c8ff00;margin-bottom:24px">New Launch Request</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#4a6080;padding:8px 0;width:120px">Plan</td><td style="color:#c8ff00;font-weight:bold">${plan}</td></tr>
            <tr><td style="color:#4a6080;padding:8px 0">Name</td><td>${name}</td></tr>
            <tr><td style="color:#4a6080;padding:8px 0">Email</td><td><a href="mailto:${email}" style="color:#60a5fa">${email}</a></td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#111829;border-radius:6px;border-left:3px solid #c8ff00">
            <div style="color:#4a6080;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Their idea</div>
            <div style="color:#e8ecf8;line-height:1.7">${idea}</div>
          </div>
          <div style="margin-top:16px;padding:16px;background:#111829;border-radius:6px;border-left:3px solid #60a5fa">
            <div style="color:#4a6080;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Full brief</div>
            <pre style="color:#8fa8cc;font-size:12px;line-height:1.7;white-space:pre-wrap">${brief?.slice(0, 2000)}...</pre>
          </div>
          <div style="margin-top:24px;padding:16px;background:#1a2236;border-radius:6px;text-align:center">
            <a href="mailto:${email}?subject=Your IdeaByLunch order — ${plan}&body=Hi ${name},%0D%0A%0D%0AThanks for your interest in IdeaByLunch! I'd love to build your product.%0D%0A%0D%0ALet's connect to discuss next steps." style="color:#c8ff00;font-size:13px">Reply to ${name} →</a>
          </div>
        </div>
      `
    })

    // Confirmation email to customer
    await resend.emails.send({
      from: 'IdeaByLunch <onboarding@resend.dev>',
      to: [email],
      subject: `Your IdeaByLunch request is in — we'll be in touch shortly`,
      html: `
        <div style="font-family:monospace;max-width:600px;margin:0 auto;background:#0a0e1a;color:#e8ecf8;padding:32px;border-radius:8px">
          <h2 style="color:#c8ff00;margin-bottom:8px">✦ Request received.</h2>
          <p style="color:#8fa8cc;margin-bottom:24px">Hi ${name} — we've got your request for the <strong style="color:#e8ecf8">${plan}</strong> plan and we'll be in touch within 24 hours to discuss next steps.</p>
          <div style="padding:16px;background:#111829;border-radius:6px;border-left:3px solid #c8ff00;margin-bottom:24px">
            <div style="color:#4a6080;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Your idea</div>
            <div style="color:#e8ecf8;line-height:1.7">${idea}</div>
          </div>
          <p style="color:#4a6080;font-size:13px">Questions? Reply to this email and we'll get back to you.</p>
          <p style="color:#4a6080;font-size:13px;margin-top:24px">— IdeaByLunch</p>
        </div>
      `
    })

    return Response.json({ success: true })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
