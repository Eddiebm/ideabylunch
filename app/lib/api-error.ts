// Centralized API error helpers — always log server-side, never expose internals.

export type ApiErrorCode =
  | 'invalid_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'conflict'
  | 'internal_error'
  | 'service_unavailable'

const STATUS: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  rate_limited: 429,
  conflict: 409,
  internal_error: 500,
  service_unavailable: 503,
}

export function apiError(
  code: ApiErrorCode,
  message?: string,
  extra?: Record<string, unknown>,
): Response {
  const status = STATUS[code]
  const body: Record<string, unknown> = { error: code }
  if (message) body.message = message
  if (extra) Object.assign(body, extra)
  return Response.json(body, { status })
}

// Use in catch blocks: logs the real error, returns a safe 500.
// Pass a label so server logs are searchable.
export function apiInternalError(label: string, err: unknown): Response {
  console.error(`[${label}]`, err instanceof Error ? err.message : String(err))
  return Response.json({ error: 'internal_error', message: 'Internal server error' }, { status: 500 })
}
