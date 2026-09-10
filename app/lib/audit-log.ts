import type { Redis } from '@upstash/redis'

// Append-only security/business event log.
// Stored as a Redis sorted set (score = timestamp) under audit:events:<subject>
// and a global audit:events stream (capped at 10k entries).
// NEVER delete or modify past events — only append.

export type AuditEventType =
  | 'payment.received'
  | 'payment.duplicate'
  | 'site.deployed'
  | 'site.promoted'
  | 'token.created'
  | 'token.revoked'
  | 'admin.action'
  | 'cron.run'
  | 'cron.skipped'
  | 'social.post_ok'
  | 'social.post_fail'
  | 'webhook.received'
  | 'webhook.invalid_sig'

export interface AuditEvent {
  type: AuditEventType
  ts: number          // Unix ms
  actor: string       // email, IP, or 'system'
  subject: string     // siteId, email, or resource identifier
  data?: Record<string, unknown>
}

const GLOBAL_KEY = 'audit:events'
const SUBJECT_PREFIX = 'audit:events:'
const GLOBAL_CAP = 10_000

export async function logAuditEvent(redis: Redis | null, event: AuditEvent): Promise<void> {
  if (!redis) return
  const serialized = JSON.stringify(event)
  // Append to subject-scoped sorted set (score = timestamp for time-range queries)
  await redis.zadd(`${SUBJECT_PREFIX}${event.subject}`, { score: event.ts, member: serialized })
  // Append to global capped list (newest first)
  await redis.lpush(GLOBAL_KEY, serialized)
  await redis.ltrim(GLOBAL_KEY, 0, GLOBAL_CAP - 1)
}

export async function getAuditEvents(
  redis: Redis | null,
  subject: string,
  opts?: { limit?: number; since?: number; until?: number },
): Promise<AuditEvent[]> {
  if (!redis) return []
  const min = opts?.since ?? 0
  const max = opts?.until ?? Date.now()
  const limit = opts?.limit ?? 100
  const raw = await redis.zrange(
    `${SUBJECT_PREFIX}${subject}`,
    min, max,
    { byScore: true, rev: true, count: limit, offset: 0 },
  ) as string[]
  return raw.map(r => JSON.parse(r) as AuditEvent)
}
