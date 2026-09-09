export const runtime = 'nodejs'

import { getRedis } from '@/app/lib/redis'
import {
  AutopilotTask,
  AutopilotWorkspace,
  EMPTY_METRICS,
  fallbackAsset,
  marketplaceStage,
  planNextTasks,
} from '@/app/lib/autopilot'
import { launchApprovedMetaCampaign, sendApprovedEmails } from '@/app/lib/growth-execution'

async function session(req: Request) {
  const token = req.headers.get('cookie')?.match(/i2l_session=([a-f0-9]+)/)?.[1]
  if (!token) return null
  const redis = getRedis()
  if (!redis) return null
  const email = await redis.get(`session:${token}`)
  if (!email) return null
  const orderId = await redis.get(`customer:${String(email)}:order`)
  if (!orderId) return null
  return { redis, email: String(email).toLowerCase(), orderId: String(orderId) }
}

const key = (email: string) => `autopilot:${email}`

async function load(req: Request) {
  const auth = await session(req)
  if (!auth) return null
  const raw = await auth.redis.get(key(auth.email))
  const workspace = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as AutopilotWorkspace : null
  return { ...auth, workspace }
}

async function save(workspace: AutopilotWorkspace, redis: NonNullable<ReturnType<typeof getRedis>>) {
  workspace.updatedAt = Date.now()
  await redis.set(key(workspace.email), JSON.stringify(workspace), { ex: 60 * 60 * 24 * 365 * 2 })
}

function activity(message: string) {
  return { id: crypto.randomUUID(), message, timestamp: Date.now() }
}

async function generateAsset(workspace: AutopilotWorkspace, task: AutopilotTask) {
  const fallback = fallbackAsset(workspace, task)
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return fallback
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 900,
        temperature: 0.55,
        messages: [{
          role: 'system',
          content: 'You are the growth operator for a two-sided marketplace. Prepare the exact execution asset requested. Be specific, concise, honest, and immediately usable. Never invent traction, customers, testimonials, scarcity, or guarantees. Do not claim that a message was sent or an ad was launched.',
        }, {
          role: 'user',
          content: `Marketplace: ${workspace.marketplaceName}\nNiche: ${workspace.niche}\nLocation: ${workspace.location}\nSellers: ${workspace.sellerProfile}\nBuyers: ${workspace.buyerProfile}\nTask: ${task.title}\nChannel: ${task.channel}\nReason: ${task.rationale}\n\nPrepare the complete asset now. Include placeholders only where a real name, link, or price is required.`,
        }],
      }),
    })
    if (!response.ok) return fallback
    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || fallback
  } catch {
    return fallback
  }
}

export async function GET(req: Request) {
  const data = await load(req)
  if (!data) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ workspace: data.workspace, stage: data.workspace ? marketplaceStage(data.workspace.metrics) : null })
}

export async function POST(req: Request) {
  const data = await load(req)
  if (!data) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const now = Date.now()

  if (body.action === 'setup') {
    const marketplaceName = String(body.marketplaceName || '').trim().slice(0, 100)
    const niche = String(body.niche || '').trim().slice(0, 160)
    if (!marketplaceName || !niche) return Response.json({ error: 'Marketplace name and niche are required' }, { status: 400 })
    const workspace: AutopilotWorkspace = {
      email: data.email,
      orderId: data.orderId,
      marketplaceName,
      niche,
      location: String(body.location || '').trim().slice(0, 120),
      sellerProfile: String(body.sellerProfile || '').trim().slice(0, 300),
      buyerProfile: String(body.buyerProfile || '').trim().slice(0, 300),
      firstTransactionGoalDays: Math.min(90, Math.max(7, Number(body.firstTransactionGoalDays) || 30)),
      dailyAdBudget: Math.min(500, Math.max(0, Number(body.dailyAdBudget) || 0)),
      maxCampaignSpend: Math.min(5000, Math.max(0, Number(body.maxCampaignSpend) || (Number(body.dailyAdBudget) || 0) * 7)),
      dailyDigest: Boolean(body.dailyDigest),
      status: 'active',
      metrics: { ...EMPTY_METRICS },
      tasks: [],
      activity: [activity('First Transaction Autopilot configured')],
      createdAt: now,
      updatedAt: now,
    }
    workspace.tasks = planNextTasks(workspace)
    workspace.activity.unshift(activity(`Daily cycle created ${workspace.tasks.length} approval task${workspace.tasks.length === 1 ? '' : 's'}`))
    await save(workspace, data.redis)
    await data.redis.sadd('autopilot:active', data.email)
    return Response.json({ workspace, stage: marketplaceStage(workspace.metrics) })
  }

  const workspace = data.workspace
  if (!workspace) return Response.json({ error: 'Set up Autopilot first' }, { status: 404 })

  if (body.action === 'run_cycle') {
    if (workspace.status === 'paused') return Response.json({ error: 'Autopilot is paused' }, { status: 409 })
    const tasks = planNextTasks(workspace)
    workspace.tasks = [...tasks, ...workspace.tasks].slice(0, 50)
    workspace.lastCycleAt = now
    workspace.activity.unshift(activity(tasks.length ? `Cycle identified ${tasks.length} new growth task${tasks.length === 1 ? '' : 's'}` : 'Cycle completed; current tasks already cover the bottleneck'))
  } else if (body.action === 'update_metrics') {
    for (const field of Object.keys(EMPTY_METRICS) as Array<keyof typeof EMPTY_METRICS>) {
      if (body.metrics?.[field] !== undefined) workspace.metrics[field] = Math.max(0, Math.floor(Number(body.metrics[field]) || 0))
    }
    workspace.activity.unshift(activity('Marketplace funnel metrics updated'))
  } else if (body.action === 'approve') {
    const task = workspace.tasks.find(item => item.id === body.taskId)
    if (!task || task.status !== 'awaiting_approval') return Response.json({ error: 'Task is not awaiting approval' }, { status: 409 })
    task.asset = await generateAsset(workspace, task)
    task.status = 'ready'
    task.preparedAt = now
    workspace.activity.unshift(activity(`Approved and prepared: ${task.title}`))
  } else if (body.action === 'execute_email') {
    const task = workspace.tasks.find(item => item.id === body.taskId)
    if (!task || task.status !== 'ready' || !task.asset) return Response.json({ error: 'Prepare and approve this task first' }, { status: 409 })
    if (task.execution) return Response.json({ error: 'This task has already been executed' }, { status: 409 })
    let result
    try {
      result = await sendApprovedEmails({
        recipients: Array.isArray(body.recipients) ? body.recipients : [],
        subject: String(body.subject || '').slice(0, 140),
        body: String(body.message || task.asset).slice(0, 10000),
        senderName: String(body.senderName || workspace.marketplaceName).slice(0, 100),
        postalAddress: String(body.postalAddress || '').slice(0, 300),
        lawfulBasisConfirmed: body.lawfulBasisConfirmed === true,
      })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Email delivery failed' }, { status: 502 })
    }
    task.execution = result
    task.status = 'completed'
    task.completedAt = now
    workspace.activity.unshift(activity(`Sent ${result.sent} approved email message${result.sent === 1 ? '' : 's'}: ${task.title}`))
  } else if (body.action === 'execute_meta') {
    const task = workspace.tasks.find(item => item.id === body.taskId)
    if (!task || task.status !== 'ready' || !task.asset || task.type !== 'buyer_acquisition') return Response.json({ error: 'Approve a buyer campaign first' }, { status: 409 })
    if (task.execution) return Response.json({ error: 'This task has already been executed' }, { status: 409 })
    const dailyBudget = Number(body.dailyBudget)
    const totalBudget = Number(body.totalBudget)
    if (!workspace.dailyAdBudget || dailyBudget > workspace.dailyAdBudget) return Response.json({ error: `Daily spend exceeds the $${workspace.dailyAdBudget} workspace limit` }, { status: 409 })
    if (!workspace.maxCampaignSpend || totalBudget > workspace.maxCampaignSpend) return Response.json({ error: `Total spend exceeds the $${workspace.maxCampaignSpend} workspace limit` }, { status: 409 })
    let result
    try {
      result = await launchApprovedMetaCampaign({
        websiteUrl: String(body.websiteUrl || '').slice(0, 500),
        message: String(body.message || task.asset).slice(0, 2000),
        headline: String(body.headline || task.title).slice(0, 100),
        country: String(body.country || 'US').trim().toUpperCase(),
        dailyBudget,
        totalBudget,
        durationDays: Math.floor(Number(body.durationDays) || 7),
        spendConfirmed: body.spendConfirmed === true,
      })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Meta campaign launch failed' }, { status: 502 })
    }
    task.execution = result
    task.status = 'completed'
    task.completedAt = now
    workspace.activity.unshift(activity(`Launched approved Meta campaign with $${result.dailyBudget}/day and $${result.totalBudget} total caps`))
  } else if (body.action === 'update_controls') {
    workspace.dailyAdBudget = Math.min(500, Math.max(0, Number(body.dailyAdBudget) || 0))
    workspace.maxCampaignSpend = Math.min(5000, Math.max(0, Number(body.maxCampaignSpend) || 0))
    if (workspace.maxCampaignSpend && workspace.maxCampaignSpend < workspace.dailyAdBudget) return Response.json({ error: 'Total campaign cap cannot be below the daily cap' }, { status: 400 })
    workspace.activity.unshift(activity(`Spend controls updated: $${workspace.dailyAdBudget}/day, $${workspace.maxCampaignSpend}/campaign`))
  } else if (body.action === 'complete' || body.action === 'reject') {
    const task = workspace.tasks.find(item => item.id === body.taskId)
    if (!task) return Response.json({ error: 'Task not found' }, { status: 404 })
    task.status = body.action === 'complete' ? 'completed' : 'rejected'
    if (body.action === 'complete') task.completedAt = now
    workspace.activity.unshift(activity(`${body.action === 'complete' ? 'Completed' : 'Rejected'}: ${task.title}`))
  } else if (body.action === 'pause' || body.action === 'resume') {
    workspace.status = body.action === 'pause' ? 'paused' : 'active'
    workspace.activity.unshift(activity(`Autopilot ${workspace.status}`))
    if (workspace.status === 'active') await data.redis.sadd('autopilot:active', data.email)
    else await data.redis.srem('autopilot:active', data.email)
  } else {
    return Response.json({ error: 'Unknown action' }, { status: 400 })
  }

  workspace.activity = workspace.activity.slice(0, 60)
  await save(workspace, data.redis)
  return Response.json({ workspace, stage: marketplaceStage(workspace.metrics) })
}
