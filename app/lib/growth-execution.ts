import { Resend } from 'resend'

export type EmailExecutionInput = {
  recipients: Array<{ email: string; name?: string }>
  subject: string
  body: string
  senderName: string
  postalAddress: string
  lawfulBasisConfirmed: boolean
}

export type MetaExecutionInput = {
  websiteUrl: string
  message: string
  headline: string
  country: string
  dailyBudget: number
  totalBudget: number
  durationDays: number
  spendConfirmed: boolean
}

export type ExecutionResult = {
  provider: 'resend' | 'meta'
  externalIds: string[]
  sent?: number
  dailyBudget?: number
  totalBudget?: number
  currency?: string
}

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character))
}

export async function sendApprovedEmails(input: EmailExecutionInput): Promise<ExecutionResult> {
  if (!input.lawfulBasisConfirmed) throw new Error('Confirm permission or another lawful basis for every recipient')
  if (!process.env.RESEND_API_KEY) throw new Error('Email sending is not configured')
  if (!input.postalAddress.trim()) throw new Error('A valid business postal address is required')
  if (!input.subject.trim() || !input.body.trim()) throw new Error('Subject and message are required')

  const seen = new Set<string>()
  const recipients = input.recipients
    .map(recipient => ({ email: recipient.email.trim().toLowerCase(), name: recipient.name?.trim() }))
    .filter(recipient => validEmail.test(recipient.email) && !seen.has(recipient.email) && seen.add(recipient.email))
  if (!recipients.length) throw new Error('Add at least one valid recipient')
  if (recipients.length > 25) throw new Error('One approved send is limited to 25 recipients')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromAddress = process.env.RESEND_FROM || 'hello@ideabylunch.com'
  const from = `${input.senderName.replace(/[\r\n<>]/g, '').trim() || 'IdeaByLunch'} <${fromAddress.replace(/^.*<|>.*$/g, '')}>`
  const footer = `\n\n---\n${input.senderName}\n${input.postalAddress}\nTo stop receiving these messages, reply with “unsubscribe.”`
  const payloads = recipients.map(recipient => ({
    from,
    to: recipient.name ? `${recipient.name.replace(/[\r\n<>]/g, '')} <${recipient.email}>` : recipient.email,
    subject: input.subject.replace(/[\r\n]/g, ' ').trim().slice(0, 140),
    text: `${input.body.trim()}${footer}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;white-space:pre-wrap">${escapeHtml(input.body.trim())}</div><hr style="margin-top:28px;border:0;border-top:1px solid #ddd"><p style="font:12px Arial,sans-serif;color:#667085">${escapeHtml(input.senderName)}<br>${escapeHtml(input.postalAddress)}<br>To stop receiving these messages, reply with “unsubscribe.”</p>`,
    headers: { 'List-Unsubscribe': `<mailto:${fromAddress.replace(/^.*<|>.*$/g, '')}?subject=unsubscribe>` },
    tags: [{ name: 'source', value: 'autopilot' }],
  }))

  const response = await resend.batch.send(payloads)
  if (response.error) throw new Error(response.error.message)
  const ids = response.data?.data?.map(item => item.id) || []
  return { provider: 'resend', externalIds: ids, sent: ids.length }
}

async function metaPost(path: string, params: Record<string, string>) {
  const token = process.env.META_AD_ACCESS_TOKEN
  if (!token) throw new Error('Meta advertising is not configured')
  const version = process.env.META_GRAPH_VERSION || 'v23.0'
  const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token }),
  })
  const data = await response.json()
  if (!response.ok || data.error) throw new Error(data.error?.message || `Meta request failed (${response.status})`)
  return data as { id: string }
}

export async function launchApprovedMetaCampaign(input: MetaExecutionInput): Promise<ExecutionResult> {
  const accountId = process.env.META_AD_ACCOUNT_ID?.replace(/^act_/, '')
  const pageId = process.env.META_PAGE_ID
  const currency = process.env.META_AD_CURRENCY || 'USD'
  if (!accountId || !pageId || !process.env.META_AD_ACCESS_TOKEN) throw new Error('Meta ad account, Page, and access token must be configured')
  if (!input.spendConfirmed) throw new Error('Explicit spend confirmation is required')
  if (!/^https:\/\//i.test(input.websiteUrl)) throw new Error('A secure destination URL is required')
  if (!/^[A-Z]{2}$/.test(input.country)) throw new Error('Use a two-letter country code')
  if (input.dailyBudget < 1 || input.totalBudget < input.dailyBudget) throw new Error('Budget is invalid')
  if (input.durationDays < 1 || input.durationDays > 30) throw new Error('Campaign duration must be 1–30 days')

  const campaign = await metaPost(`act_${accountId}/campaigns`, {
    name: `IdeaByLunch | ${input.headline.slice(0, 60)} | ${new Date().toISOString().slice(0, 10)}`,
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: '[]',
    daily_budget: String(Math.round(input.dailyBudget * 100)),
    spend_cap: String(Math.round(input.totalBudget * 100)),
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  })

  const createdIds = [campaign.id]
  try {
    const end = new Date(Date.now() + input.durationDays * 24 * 60 * 60 * 1000).toISOString()
    const adSet = await metaPost(`act_${accountId}/adsets`, {
      name: `${input.country} | Website visitors`,
      campaign_id: campaign.id,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      destination_type: 'WEBSITE',
      targeting: JSON.stringify({ geo_locations: { countries: [input.country] }, age_min: 21, age_max: 65 }),
      end_time: end,
      status: 'PAUSED',
    })
    createdIds.push(adSet.id)
    const creative = await metaPost(`act_${accountId}/adcreatives`, {
      name: `${input.headline.slice(0, 50)} creative`,
      object_story_spec: JSON.stringify({
        page_id: pageId,
        link_data: {
          link: input.websiteUrl,
          message: input.message,
          name: input.headline,
          call_to_action: { type: 'LEARN_MORE', value: { link: input.websiteUrl } },
        },
      }),
    })
    createdIds.push(creative.id)
    const ad = await metaPost(`act_${accountId}/ads`, {
      name: `${input.headline.slice(0, 50)} ad`,
      adset_id: adSet.id,
      creative: JSON.stringify({ creative_id: creative.id }),
      status: 'PAUSED',
    })
    createdIds.push(ad.id)

    await metaPost(adSet.id, { status: 'ACTIVE' })
    await metaPost(ad.id, { status: 'ACTIVE' })
    await metaPost(campaign.id, { status: 'ACTIVE' })
    return { provider: 'meta', externalIds: createdIds, dailyBudget: input.dailyBudget, totalBudget: input.totalBudget, currency }
  } catch (error) {
    await metaPost(campaign.id, { status: 'PAUSED' }).catch(() => undefined)
    throw error
  }
}
