export const runtime = 'nodejs'

import { getRedis } from '@/app/lib/redis'
import {
  EmployeeItem,
  EmployeeSkillType,
  EmployeeWorkspace,
  SKILL_LABELS,
  activity,
  draftTitle,
  fallbackDraft,
  newItemId,
  newVoiceNoteId,
  voiceContext,
} from '@/app/lib/employee'
import { sendApprovedEmails } from '@/app/lib/growth-execution'

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

const key = (email: string) => `employee:${email}`

async function load(req: Request) {
  const auth = await session(req)
  if (!auth) return null
  const raw = await auth.redis.get(key(auth.email))
  const workspace = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) as EmployeeWorkspace : null
  return { ...auth, workspace }
}

async function save(workspace: EmployeeWorkspace, redis: NonNullable<ReturnType<typeof getRedis>>) {
  workspace.updatedAt = Date.now()
  await redis.set(key(workspace.email), JSON.stringify(workspace), { ex: 60 * 60 * 24 * 365 * 2 })
}

async function generateDraft(workspace: EmployeeWorkspace, item: Pick<EmployeeItem, 'skill' | 'context' | 'contactName'>) {
  const fallback = fallbackDraft(workspace, item)
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return fallback
  const learned = voiceContext(workspace, item.skill)
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 700,
        temperature: 0.55,
        messages: [{
          role: 'system',
          content: 'You are an AI employee handling one recurring task for a small business. Draft the exact item requested — a reply, a follow-up, or a report — so a human only needs to approve, lightly edit, or reject it. Be specific, concise, and honest. Never invent numbers, customers, or promises the business has not made. Match the business\'s past-approved voice when notes are given.',
        }, {
          role: 'user',
          content: `Business: ${workspace.businessName} (${workspace.businessType})\nSkill: ${SKILL_LABELS[item.skill].label}\nContact: ${item.contactName || 'n/a'}\nSituation: ${item.context}${learned ? `\n\nThis business's past approve/reject/edit history for this skill:\n${learned}` : ''}\n\nWrite the complete draft now.`,
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
  return Response.json({ workspace: data.workspace })
}

export async function POST(req: Request) {
  const data = await load(req)
  if (!data) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const now = Date.now()

  if (body.action === 'setup') {
    const businessName = String(body.businessName || '').trim().slice(0, 100)
    const businessType = String(body.businessType || '').trim().slice(0, 120)
    const skills = (Array.isArray(body.skills) ? body.skills : []).filter((skill: string): skill is EmployeeSkillType => skill in SKILL_LABELS)
    if (!businessName || !businessType) return Response.json({ error: 'Business name and type are required' }, { status: 400 })
    if (!skills.length) return Response.json({ error: 'Pick at least one skill to hand off' }, { status: 400 })
    const workspace: EmployeeWorkspace = {
      email: data.email,
      orderId: data.orderId,
      businessName,
      businessType,
      skills,
      status: 'active',
      items: [],
      voiceNotes: [],
      activity: [activity('AI employee configured')],
      stats: { approved: 0, rejected: 0, rewritten: 0 },
      createdAt: now,
      updatedAt: now,
    }
    await save(workspace, data.redis)
    return Response.json({ workspace })
  }

  const workspace = data.workspace
  if (!workspace) return Response.json({ error: 'Set up your AI employee first' }, { status: 404 })

  if (body.action === 'add_item') {
    if (workspace.status === 'paused') return Response.json({ error: 'The AI employee is paused' }, { status: 409 })
    const skill = String(body.skill || '') as EmployeeSkillType
    if (!(skill in SKILL_LABELS) || !workspace.skills.includes(skill)) return Response.json({ error: 'That skill is not enabled' }, { status: 400 })
    const context = String(body.context || '').trim().slice(0, 1000)
    if (!context) return Response.json({ error: 'Describe what needs a response' }, { status: 400 })
    const contactName = String(body.contactName || '').trim().slice(0, 100) || undefined
    const contactEmail = String(body.contactEmail || '').trim().slice(0, 200) || undefined
    const item: EmployeeItem = {
      id: newItemId(),
      skill,
      title: draftTitle(skill, contactName),
      context,
      contactName,
      contactEmail,
      draft: '',
      status: 'awaiting_approval',
      createdAt: now,
    }
    item.draft = await generateDraft(workspace, item)
    workspace.items.unshift(item)
    workspace.activity.unshift(activity(`Drafted: ${item.title}`))
  } else if (body.action === 'approve') {
    const item = workspace.items.find(entry => entry.id === body.itemId)
    if (!item || item.status !== 'awaiting_approval') return Response.json({ error: 'Item is not awaiting approval' }, { status: 409 })
    item.status = 'approved'
    item.decidedAt = now
    workspace.stats.approved += 1
    workspace.activity.unshift(activity(`Approved: ${item.title}`))
  } else if (body.action === 'rewrite') {
    const item = workspace.items.find(entry => entry.id === body.itemId)
    if (!item || item.status !== 'awaiting_approval') return Response.json({ error: 'Item is not awaiting approval' }, { status: 409 })
    const edited = String(body.draft || '').trim().slice(0, 5000)
    if (!edited) return Response.json({ error: 'Edited draft cannot be empty' }, { status: 400 })
    item.draft = edited
    item.status = 'approved'
    item.decidedAt = now
    item.wasRewritten = true
    workspace.stats.approved += 1
    workspace.stats.rewritten += 1
    workspace.voiceNotes.unshift({ id: newVoiceNoteId(), skill: item.skill, kind: 'rewrite', note: edited.slice(0, 400), createdAt: now })
    workspace.voiceNotes = workspace.voiceNotes.slice(0, 40)
    workspace.activity.unshift(activity(`Approved with edits: ${item.title}`))
  } else if (body.action === 'reject') {
    const item = workspace.items.find(entry => entry.id === body.itemId)
    if (!item || item.status !== 'awaiting_approval') return Response.json({ error: 'Item is not awaiting approval' }, { status: 409 })
    const reason = String(body.reason || '').trim().slice(0, 400)
    item.status = 'rejected'
    item.decidedAt = now
    item.rejectionReason = reason || undefined
    workspace.stats.rejected += 1
    if (reason) {
      workspace.voiceNotes.unshift({ id: newVoiceNoteId(), skill: item.skill, kind: 'rejection', note: reason, createdAt: now })
      workspace.voiceNotes = workspace.voiceNotes.slice(0, 40)
    }
    workspace.activity.unshift(activity(`Rejected: ${item.title}`))
  } else if (body.action === 'send') {
    const item = workspace.items.find(entry => entry.id === body.itemId)
    if (!item || item.status !== 'approved') return Response.json({ error: 'Approve this item first' }, { status: 409 })
    if (item.execution) return Response.json({ error: 'This item has already been sent' }, { status: 409 })
    if (!item.contactEmail) return Response.json({ error: 'This item has no recipient email' }, { status: 400 })
    let result
    try {
      result = await sendApprovedEmails({
        recipients: [{ email: item.contactEmail, name: item.contactName }],
        subject: String(body.subject || item.title).slice(0, 140),
        body: String(body.message || item.draft).slice(0, 10000),
        senderName: String(body.senderName || workspace.businessName).slice(0, 100),
        postalAddress: String(body.postalAddress || '').slice(0, 300),
        lawfulBasisConfirmed: body.lawfulBasisConfirmed === true,
      })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Email delivery failed' }, { status: 502 })
    }
    item.execution = { provider: 'resend', externalIds: result.externalIds, sent: result.sent || 0 }
    item.status = 'sent'
    workspace.activity.unshift(activity(`Sent: ${item.title}`))
  } else if (body.action === 'complete') {
    const item = workspace.items.find(entry => entry.id === body.itemId)
    if (!item || item.status !== 'approved') return Response.json({ error: 'Approve this item first' }, { status: 409 })
    item.status = 'sent'
    workspace.activity.unshift(activity(`Marked handled: ${item.title}`))
  } else if (body.action === 'update_skills') {
    const skills = (Array.isArray(body.skills) ? body.skills : []).filter((skill: string): skill is EmployeeSkillType => skill in SKILL_LABELS)
    if (!skills.length) return Response.json({ error: 'Keep at least one skill enabled' }, { status: 400 })
    workspace.skills = skills
    workspace.activity.unshift(activity(`Skills updated: ${skills.map((skill: EmployeeSkillType) => SKILL_LABELS[skill].label).join(', ')}`))
  } else if (body.action === 'pause' || body.action === 'resume') {
    workspace.status = body.action === 'pause' ? 'paused' : 'active'
    workspace.activity.unshift(activity(`AI employee ${workspace.status}`))
  } else {
    return Response.json({ error: 'Unknown action' }, { status: 400 })
  }

  workspace.items = workspace.items.slice(0, 200)
  workspace.activity = workspace.activity.slice(0, 60)
  await save(workspace, data.redis)
  return Response.json({ workspace })
}
