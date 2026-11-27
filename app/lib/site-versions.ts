import { getDb } from './db'

export interface SiteVersion {
  id: string
  html: string
  content_hash: string
  customer_email: string | null
  session_token_hash: string
  brief: Record<string, unknown>
  selected_style: string
  generation_model: string
  generation_config: Record<string, unknown>
  approval_timestamp: string
  checkout_session_id: string | null
  payment_intent_id: string | null
  delivery_status: 'pending' | 'claiming' | 'delivered' | 'failed' | 'manual_review'
  delivery_deployment_id: string | null
  delivery_timestamp: string | null
  delivery_error: string | null
  created_at: string
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSiteVersion(params: {
  html: string
  customerEmail: string | null
  sessionToken: string
  brief: Record<string, unknown>
  selectedStyle: string
  generationModel: string
  generationConfig: Record<string, unknown>
}): Promise<{ id: string }> {
  const sql = getDb()
  const contentHash = await sha256Hex(params.html)
  const sessionTokenHash = await sha256Hex(params.sessionToken)

  const rows = await sql`
    INSERT INTO site_versions (
      html, content_hash, customer_email, session_token_hash,
      brief, selected_style, generation_model, generation_config
    ) VALUES (
      ${params.html}, ${contentHash}, ${params.customerEmail}, ${sessionTokenHash},
      ${JSON.stringify(params.brief)}, ${params.selectedStyle},
      ${params.generationModel}, ${JSON.stringify(params.generationConfig)}
    )
    RETURNING id
  `
  return { id: rows[0].id as string }
}

export async function verifyOwnership(params: {
  versionId: string
  sessionToken: string
}): Promise<boolean> {
  const sql = getDb()
  const tokenHash = await sha256Hex(params.sessionToken)
  const rows = await sql`
    SELECT id FROM site_versions
    WHERE id = ${params.versionId}
      AND session_token_hash = ${tokenHash}
      AND delivery_status = 'pending'
  `
  return rows.length > 0
}

export async function bindCheckoutSession(params: {
  versionId: string
  sessionToken: string
  checkoutSessionId: string
}): Promise<boolean> {
  const sql = getDb()
  const tokenHash = await sha256Hex(params.sessionToken)
  const rows = await sql`
    UPDATE site_versions
    SET checkout_session_id = ${params.checkoutSessionId}
    WHERE id = ${params.versionId}
      AND session_token_hash = ${tokenHash}
      AND delivery_status = 'pending'
    RETURNING id
  `
  return rows.length > 0
}

export async function getVersionByCheckout(checkoutSessionId: string): Promise<SiteVersion | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM site_versions WHERE checkout_session_id = ${checkoutSessionId} LIMIT 1
  `
  return rows.length > 0 ? (rows[0] as SiteVersion) : null
}

export async function getVersionByPaymentIntent(paymentIntentId: string): Promise<SiteVersion | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM site_versions WHERE payment_intent_id = ${paymentIntentId} LIMIT 1
  `
  return rows.length > 0 ? (rows[0] as SiteVersion) : null
}

// Atomic status transition: pending → claiming. Returns false if already claimed/delivered.
export async function claimDelivery(versionId: string): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`
    UPDATE site_versions
    SET delivery_status = 'claiming'
    WHERE id = ${versionId} AND delivery_status = 'pending'
    RETURNING id
  `
  return rows.length > 0
}

export async function markDelivered(params: {
  versionId: string
  deploymentId: string
  paymentIntentId?: string
}): Promise<void> {
  const sql = getDb()
  await sql`
    UPDATE site_versions
    SET delivery_status = 'delivered',
        delivery_deployment_id = ${params.deploymentId},
        delivery_timestamp = now(),
        payment_intent_id = COALESCE(payment_intent_id, ${params.paymentIntentId ?? null})
    WHERE id = ${params.versionId}
  `
}

export async function markDeliveryFailed(params: {
  versionId: string
  error: string
}): Promise<void> {
  const sql = getDb()
  await sql`
    UPDATE site_versions
    SET delivery_status = 'failed',
        delivery_error = ${params.error}
    WHERE id = ${params.versionId}
  `
}

export async function markManualReview(params: {
  versionId: string
  reason: string
}): Promise<void> {
  const sql = getDb()
  await sql`
    UPDATE site_versions
    SET delivery_status = 'manual_review',
        delivery_error = ${params.reason}
    WHERE id = ${params.versionId}
  `
}
