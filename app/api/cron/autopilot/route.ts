export const runtime = 'nodejs'

import { Resend } from 'resend'
import { getRedis } from '@/app/lib/redis'
import { AutopilotWorkspace, marketplaceStage, planNextTasks } from '@/app/lib/autopilot'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character))
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 503 })

  const emails = await redis.smembers('autopilot:active')
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const from = process.env.RESEND_FROM || 'hello@ideabylunch.com'
  let planned = 0
  let digests = 0
  const errors: string[] = []

  for (const email of emails) {
    try {
      const raw = await redis.get(`autopilot:${email}`)
      if (!raw) continue
      const workspace = (typeof raw === 'string' ? JSON.parse(raw) : raw) as AutopilotWorkspace
      if (workspace.status !== 'active') continue

      const tasks = planNextTasks(workspace)
      const now = Date.now()
      workspace.tasks = [...tasks, ...workspace.tasks].slice(0, 50)
      workspace.lastCycleAt = now
      workspace.updatedAt = now
      workspace.activity.unshift({
        id: crypto.randomUUID(),
        message: tasks.length ? `Daily cycle identified ${tasks.length} new growth task${tasks.length === 1 ? '' : 's'}` : 'Daily cycle completed; open tasks still cover the bottleneck',
        timestamp: now,
      })
      workspace.activity = workspace.activity.slice(0, 60)
      await redis.set(`autopilot:${email}`, JSON.stringify(workspace), { ex: 60 * 60 * 24 * 365 * 2 })
      planned += tasks.length

      if (workspace.dailyDigest && tasks.length && resend) {
        const stage = marketplaceStage(workspace.metrics)
        const taskList = tasks.map(task => `<li style="margin-bottom:10px"><strong>${escapeHtml(task.title)}</strong><br><span style="color:#667085">${escapeHtml(task.rationale)}</span></li>`).join('')
        await resend.emails.send({
          from,
          to: email,
          subject: `${workspace.marketplaceName.replace(/[\r\n]/g, ' ')}: ${tasks.length} action${tasks.length === 1 ? '' : 's'} awaiting approval`,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#101828"><p style="font-size:12px;letter-spacing:1.2px;color:#7a4df5;font-weight:bold">FIRST TRANSACTION AUTOPILOT</p><h1 style="font-size:28px">${escapeHtml(stage.label)}</h1><p>Today’s cycle found the following actions. Nothing has been sent and no ad spend has been authorized.</p><ul style="padding-left:20px">${taskList}</ul><p><a href="https://ideabylunch.com/dashboard/autopilot" style="display:inline-block;background:#7a4df5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">Review and approve</a></p></div>`,
        })
        digests++
      }
    } catch (error) {
      errors.push(`${email}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return Response.json({ ok: true, workspaces: emails.length, planned, digests, errors })
}
