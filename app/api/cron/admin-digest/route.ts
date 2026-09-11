// Daily admin digest — sent every morning at 7am UTC
// Summarises: pending reviews, new orders, revenue delta, funnel bottleneck, paused sellers
// Cron schedule (vercel.json / cron tab): 0 7 * * *

export const runtime = 'edge'
import { Resend } from 'resend'
import { getRedis } from '@/app/lib/redis'
import { getFunnelStats } from '@/app/lib/funnel'
import { logAuditEvent } from '@/app/lib/audit-log'

function guard(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!guard(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const resendKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL
  if (!resendKey || !adminEmail) {
    return Response.json({ ok: false, reason: 'RESEND_API_KEY or ADMIN_EMAIL not set' })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ ok: false, reason: 'Redis unavailable' })

  // --- Gather data ---

  // Orders pending review (deployed to preview but not yet promoted to prod)
  const orderKeys = await redis.keys('order:*')
  const orders: any[] = []
  for (const key of orderKeys) {
    const raw = await redis.get(key)
    if (!raw) continue
    orders.push(typeof raw === 'string' ? JSON.parse(raw) : raw)
  }
  const pendingReview = orders.filter(o => o.status === 'preview' || o.status === 'needs_manual_build')
  const recentOrders = orders
    .filter(o => o.deployedAt && o.deployedAt > Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => (b.deployedAt || 0) - (a.deployedAt || 0))
  const last24hRevenue = recentOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0)

  // Paused sellers
  const pausedKeys = await redis.keys('seller:paused:*')
  const pausedSellers = pausedKeys.map(k => k.replace('seller:paused:', ''))

  // Funnel stats
  const { steps: funnelSteps, bottleneck } = await getFunnelStats(redis)

  // --- Build email ---
  const funnelTable = funnelSteps
    .map(s => {
      const pct = s.conversionRate !== null ? `${Math.round(s.conversionRate * 100)}%` : '—'
      const flag = s.step === bottleneck ? ' ⚠️' : ''
      return `<tr><td style="padding:4px 12px 4px 0;color:#3C3C43">${s.step}</td><td style="padding:4px 12px 4px 0;text-align:right">${s.count.toLocaleString()}</td><td style="padding:4px 0;text-align:right;color:${s.step === bottleneck ? '#FF3B30' : '#6E6E73'}">${pct}${flag}</td></tr>`
    })
    .join('')

  const pendingSection = pendingReview.length > 0
    ? `<h3 style="margin:24px 0 8px;font-size:16px">🔴 Pending Review (${pendingReview.length})</h3>
       <table style="border-collapse:collapse;width:100%">
         ${pendingReview.slice(0, 10).map(o => `<tr><td style="padding:4px 12px 4px 0;color:#3C3C43">${o.productName || '—'}</td><td style="padding:4px 0;color:#6E6E73;font-size:13px">${o.lastEditedBy || '?'}</td></tr>`).join('')}
       </table>`
    : `<p style="color:#30D158;margin:24px 0 8px">✅ No sites pending review</p>`

  const pausedSection = pausedSellers.length > 0
    ? `<h3 style="margin:24px 0 8px;font-size:16px">⏸ Paused Sellers (${pausedSellers.length})</h3>
       <ul style="margin:0;padding-left:20px;color:#6E6E73">${pausedSellers.map(e => `<li>${e}</li>`).join('')}</ul>`
    : ''

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#fff">
  <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#1D1D1F">IdeaByLunch Daily Digest</h1>
  <p style="margin:0 0 24px;color:#6E6E73;font-size:14px">${new Date().toUTCString()}</p>

  <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#1D1D1F">Last 24h</h2>
  <div style="display:flex;gap:24px;margin-bottom:24px">
    <div style="background:#F2F2F7;border-radius:10px;padding:12px 16px;flex:1">
      <div style="font-size:24px;font-weight:700;color:#1D1D1F">${recentOrders.length}</div>
      <div style="font-size:13px;color:#6E6E73">new orders</div>
    </div>
    <div style="background:#F2F2F7;border-radius:10px;padding:12px 16px;flex:1">
      <div style="font-size:24px;font-weight:700;color:#1D1D1F">$${(last24hRevenue / 100).toFixed(0)}</div>
      <div style="font-size:13px;color:#6E6E73">revenue</div>
    </div>
    <div style="background:#F2F2F7;border-radius:10px;padding:12px 16px;flex:1">
      <div style="font-size:24px;font-weight:700;color:${pendingReview.length > 0 ? '#FF3B30' : '#30D158'}">${pendingReview.length}</div>
      <div style="font-size:13px;color:#6E6E73">pending review</div>
    </div>
  </div>

  ${pendingSection}
  ${pausedSection}

  <h3 style="margin:24px 0 8px;font-size:16px">📊 Funnel${bottleneck ? ` — bottleneck: <span style="color:#FF3B30">${bottleneck}</span>` : ''}</h3>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <tr style="color:#AEAEB2;font-size:12px"><th style="text-align:left;padding-bottom:4px">Step</th><th style="text-align:right;padding-bottom:4px">Total</th><th style="text-align:right;padding-bottom:4px">Conv.</th></tr>
    ${funnelTable}
  </table>

  <p style="margin:32px 0 0;font-size:12px;color:#AEAEB2">
    IdeaByLunch Admin · <a href="https://ideabylunch.com" style="color:#0066CC;text-decoration:none">Dashboard</a>
  </p>
</div>`

  const resend = new Resend(resendKey)
  await resend.emails.send({
    from: process.env.RESEND_FROM || 'IdeaByLunch <hello@ideabylunch.com>',
    to: adminEmail,
    subject: `IBL Digest — ${recentOrders.length} orders, $${(last24hRevenue / 100).toFixed(0)} revenue${pendingReview.length > 0 ? `, ${pendingReview.length} pending` : ''}`,
    html,
  })

  await logAuditEvent(redis, {
    type: 'cron.run',
    ts: Date.now(),
    actor: 'system',
    subject: 'cron:admin-digest',
    data: { orders: recentOrders.length, revenue: last24hRevenue, pending: pendingReview.length },
  })

  return Response.json({ ok: true, sent: adminEmail, orders: recentOrders.length, pending: pendingReview.length })
}
