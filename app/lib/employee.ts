export type EmployeeSkillType = 'lead_followup' | 'inbox_reply' | 'weekly_report'
export type EmployeeItemStatus = 'awaiting_approval' | 'approved' | 'rejected' | 'sent'
export type EmployeeStatus = 'active' | 'paused'

export const SKILL_LABELS: Record<EmployeeSkillType, { label: string; blurb: string; needsContact: boolean }> = {
  lead_followup: { label: 'Lead follow-up', blurb: 'Draft a follow-up to a lead that has gone quiet.', needsContact: true },
  inbox_reply: { label: 'Inbox reply', blurb: 'Draft a reply to a message sitting in the inbox.', needsContact: true },
  weekly_report: { label: 'Weekly report', blurb: 'Draft the weekly summary nobody has time to build.', needsContact: false },
}

export type EmployeeItem = {
  id: string
  skill: EmployeeSkillType
  title: string
  context: string
  contactName?: string
  contactEmail?: string
  draft: string
  status: EmployeeItemStatus
  createdAt: number
  decidedAt?: number
  rejectionReason?: string
  wasRewritten?: boolean
  execution?: { provider: 'resend'; externalIds: string[]; sent: number }
}

export type VoiceNote = {
  id: string
  skill: EmployeeSkillType
  kind: 'rewrite' | 'rejection'
  note: string
  createdAt: number
}

export type EmployeeActivity = {
  id: string
  message: string
  timestamp: number
}

export type EmployeeStats = { approved: number; rejected: number; rewritten: number }

export type EmployeeWorkspace = {
  email: string
  orderId: string
  businessName: string
  businessType: string
  skills: EmployeeSkillType[]
  status: EmployeeStatus
  items: EmployeeItem[]
  voiceNotes: VoiceNote[]
  activity: EmployeeActivity[]
  stats: EmployeeStats
  createdAt: number
  updatedAt: number
}

const id = () => `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`
export const newItemId = id
export const newActivityId = id
export const newVoiceNoteId = id

export function activity(message: string): EmployeeActivity {
  return { id: id(), message, timestamp: Date.now() }
}

/**
 * Most-recently-taught preferences for a skill, folded into the next prompt so the agent's
 * drafts drift toward what this business has actually approved and rewritten in the past —
 * the "approve/rewrite trains the agent" loop from the pitch.
 */
export function voiceContext(workspace: EmployeeWorkspace, skill: EmployeeSkillType, limit = 5): string {
  const notes = workspace.voiceNotes.filter(note => note.skill === skill).slice(0, limit)
  if (!notes.length) return ''
  return notes.map(note => `- (${note.kind === 'rewrite' ? 'edited to' : 'rejected because'}) ${note.note}`).join('\n')
}

export function fallbackDraft(workspace: EmployeeWorkspace, item: Pick<EmployeeItem, 'skill' | 'context' | 'contactName'>): string {
  const contact = item.contactName || 'there'
  const business = workspace.businessName || 'our team'
  if (item.skill === 'lead_followup') {
    return `SUBJECT: Still the right time?\n\nHi ${contact},\n\nWe wanted to check back in — we know things get busy. ${item.context}\n\nIs this still something you'd like to move forward with? Happy to answer any questions or find a time that works.\n\n— ${business}`
  }
  if (item.skill === 'inbox_reply') {
    return `Hi ${contact},\n\nThanks for reaching out. ${item.context}\n\nLet us know if you have any other questions — happy to help.\n\n— ${business}`
  }
  return `WEEKLY REPORT — ${business}\n\n${item.context}\n\n(Fill in verified numbers before sending — the agent does not invent metrics.)`
}

export function draftTitle(skill: EmployeeSkillType, contactName?: string): string {
  if (skill === 'lead_followup') return `Follow up with ${contactName || 'lead'}`
  if (skill === 'inbox_reply') return `Reply to ${contactName || 'inbox message'}`
  return 'Weekly report draft'
}
