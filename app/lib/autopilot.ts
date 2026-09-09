export type AutopilotStatus = 'active' | 'paused'
export type AutopilotTaskStatus = 'awaiting_approval' | 'ready' | 'completed' | 'rejected'

export type MarketplaceMetrics = {
  sellers: number
  listings: number
  buyers: number
  leads: number
  transactions: number
}

export type AutopilotTask = {
  id: string
  type: 'seller_outreach' | 'seller_activation' | 'buyer_acquisition' | 'lead_followup' | 'conversion_review'
  title: string
  rationale: string
  channel: string
  status: AutopilotTaskStatus
  createdAt: number
  preparedAt?: number
  completedAt?: number
  asset?: string
  execution?: {
    provider: 'resend' | 'meta'
    externalIds: string[]
    sent?: number
    dailyBudget?: number
    totalBudget?: number
    currency?: string
  }
}

export type AutopilotActivity = {
  id: string
  message: string
  timestamp: number
}

export type AutopilotWorkspace = {
  email: string
  orderId: string
  marketplaceName: string
  niche: string
  location: string
  sellerProfile: string
  buyerProfile: string
  firstTransactionGoalDays: number
  dailyAdBudget: number
  maxCampaignSpend: number
  dailyDigest: boolean
  status: AutopilotStatus
  metrics: MarketplaceMetrics
  tasks: AutopilotTask[]
  activity: AutopilotActivity[]
  createdAt: number
  updatedAt: number
  lastCycleAt?: number
}

export const EMPTY_METRICS: MarketplaceMetrics = {
  sellers: 0,
  listings: 0,
  buyers: 0,
  leads: 0,
  transactions: 0,
}

const taskId = () => `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`

export function marketplaceStage(metrics: MarketplaceMetrics) {
  if (metrics.transactions > 0) return { label: 'First transaction reached', key: 'transaction', score: 100 }
  if (metrics.leads > 0) return { label: 'Convert active demand', key: 'conversion', score: 80 }
  if (metrics.buyers >= 10) return { label: 'Create buyer inquiries', key: 'leads', score: 60 }
  if (metrics.listings >= 10) return { label: 'Bring in qualified buyers', key: 'buyers', score: 40 }
  if (metrics.sellers >= 5) return { label: 'Activate seller listings', key: 'listings', score: 25 }
  return { label: 'Recruit founding sellers', key: 'sellers', score: 10 }
}

function makeTask(
  type: AutopilotTask['type'],
  title: string,
  rationale: string,
  channel: string,
): AutopilotTask {
  return { id: taskId(), type, title, rationale, channel, status: 'awaiting_approval', createdAt: Date.now() }
}

export function planNextTasks(workspace: AutopilotWorkspace): AutopilotTask[] {
  const m = workspace.metrics
  const pendingTypes = new Set(
    workspace.tasks.filter(task => task.status === 'awaiting_approval' || task.status === 'ready').map(task => task.type),
  )
  const tasks: AutopilotTask[] = []

  if (m.sellers < 10 && !pendingTypes.has('seller_outreach')) {
    tasks.push(makeTask(
      'seller_outreach',
      'Recruit 10 founding sellers',
      `Only ${m.sellers} sellers have joined. Supply is the current marketplace bottleneck.`,
      'Email / direct message',
    ))
  }

  if (m.sellers > 0 && m.listings < Math.max(10, m.sellers * 2) && !pendingTypes.has('seller_activation')) {
    tasks.push(makeTask(
      'seller_activation',
      'Turn signed-up sellers into live listings',
      `${m.sellers} sellers have produced ${m.listings} listings. Buyers need enough inventory to compare.`,
      'Seller email',
    ))
  }

  if (m.listings >= 5 && m.buyers < 25 && !pendingTypes.has('buyer_acquisition')) {
    tasks.push(makeTask(
      'buyer_acquisition',
      'Launch a focused buyer campaign',
      `${m.listings} listings are available, but only ${m.buyers} buyers have entered the marketplace.`,
      workspace.dailyAdBudget > 0 ? 'Organic + paid social draft' : 'Organic social / communities',
    ))
  }

  if (m.leads > m.transactions && !pendingTypes.has('lead_followup')) {
    tasks.push(makeTask(
      'lead_followup',
      'Follow up with every open buyer inquiry',
      `${m.leads - m.transactions} inquiries have not yet become transactions.`,
      'Email / WhatsApp draft',
    ))
  }

  if (m.buyers >= 10 && m.leads === 0 && !pendingTypes.has('conversion_review')) {
    tasks.push(makeTask(
      'conversion_review',
      'Remove friction from the inquiry flow',
      `${m.buyers} buyers have visited without creating an inquiry. The conversion path needs attention.`,
      'Marketplace optimization',
    ))
  }

  return tasks.slice(0, 3)
}

export function fallbackAsset(workspace: AutopilotWorkspace, task: AutopilotTask): string {
  const seller = workspace.sellerProfile || `trusted ${workspace.niche} providers`
  const buyer = workspace.buyerProfile || `people looking for ${workspace.niche}`
  const market = workspace.location ? ` in ${workspace.location}` : ''

  if (task.type === 'seller_outreach') {
    return `SUBJECT: Founding seller invitation — ${workspace.marketplaceName}\n\nHi [Name],\n\nWe are inviting a small group of ${seller}${market} to become founding sellers on ${workspace.marketplaceName}. Founding sellers receive early visibility and direct buyer inquiries while we build the initial marketplace.\n\nWould you be open to a 10-minute conversation or creating your first listing this week?\n\n[Marketplace link]\n\n— ${workspace.marketplaceName}`
  }
  if (task.type === 'seller_activation') {
    return `SUBJECT: Your first listing can be live today\n\nHi [Name],\n\nBuyers on ${workspace.marketplaceName} need enough detail to confidently contact you. Please add your first listing today: a clear title, three specific benefits, transparent starting price, location, and one strong photo.\n\nComplete your listing: [seller link]\n\nReply if you would like us to help prepare it.\n\n— ${workspace.marketplaceName}`
  }
  if (task.type === 'buyer_acquisition') {
    return `CAMPAIGN ANGLE: Compare trusted options without chasing providers\n\nPOST:\nLooking for ${workspace.niche}${market}? ${workspace.marketplaceName} helps ${buyer} compare real options and contact the right seller in one place. Browse the first listings and tell us what is missing.\n\n[Marketplace link]\n\nCTA: Browse available listings`
  }
  if (task.type === 'lead_followup') {
    return `SUBJECT: Still looking for the right option?\n\nHi [Name],\n\nYou recently made an inquiry through ${workspace.marketplaceName}. Did you receive what you needed? Reply with the one thing holding you back—availability, price, fit, or timing—and we will help you take the next step.\n\nReview your options: [marketplace link]\n\n— ${workspace.marketplaceName}`
  }
  return `CONVERSION REVIEW\n\n1. Put one specific buyer action above the fold.\n2. Show at least five complete listings before promoting the marketplace.\n3. Ask for only the information required to make an inquiry.\n4. Add response-time expectations beside the main CTA.\n5. Test the full inquiry flow on mobile and follow up within one business day.`
}
