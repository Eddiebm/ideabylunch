/**
 * Stateful SSE line buffer for ReadableStream consumers.
 *
 * Problem this fixes (D-001): `decoder.decode(chunk, { stream: true }).split('\n')` loses
 * the partial line at the end of each chunk — it's accumulated by TextDecoder but then
 * thrown away when split() discards the trailing incomplete line.
 *
 * Fix: maintain a string buffer across reads; only process lines that end with \n.
 */
export interface SSECallbacks {
  onChunk: (text: string) => void
  onDone: () => void
  onError: (msg: string) => void
}

/**
 * Parse a single decoded string segment, using `buf` as the carry-over from the
 * previous segment. Returns the new buffer (incomplete line at the end, if any).
 */
export function processSSESegment(
  segment: string,
  buf: string,
  callbacks: SSECallbacks,
): string {
  const full = buf + segment
  const lines = full.split('\n')
  // All lines except the last are complete (the last may be a partial line with no \n yet)
  const incomplete = lines.pop() ?? ''

  for (const line of lines) {
    const trimmed = line.replace(/\r$/, '').trimEnd()
    if (!trimmed.startsWith('data: ')) continue
    const data = trimmed.slice(6).trim()
    if (data === '[DONE]') {
      callbacks.onDone()
      return ''
    }
    try {
      const parsed = JSON.parse(data)
      const text = parsed?.delta?.text ?? parsed?.choices?.[0]?.delta?.content ?? ''
      if (text) callbacks.onChunk(text)
    } catch {
      // malformed JSON in one SSE event — skip it, keep streaming
    }
  }

  return incomplete
}

/**
 * Fully consumes a `fetch` Response body as an SSE stream.
 * Handles fragmented chunks, incomplete lines, malformed payloads, and premature close.
 */
export async function consumeSSEResponse(
  res: Response,
  callbacks: SSECallbacks,
  signal?: AbortSignal,
): Promise<void> {
  if (!res.ok) {
    callbacks.onError(`HTTP ${res.status}`)
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    callbacks.onError('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buf = ''
  let doneCalled = false

  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      const segment = decoder.decode(value, { stream: true })
      buf = processSSESegment(segment, buf, {
        ...callbacks,
        onDone: () => {
          doneCalled = true
          callbacks.onDone()
        },
      })
      if (doneCalled) break
    }

    // Flush any remaining bytes from the TextDecoder
    const tail = decoder.decode()
    if (tail) {
      buf = processSSESegment(tail, buf, {
        ...callbacks,
        onDone: () => {
          doneCalled = true
          callbacks.onDone()
        },
      })
    }

    // Stream ended without [DONE] — treat as completion (premature close handled gracefully)
    if (!doneCalled) callbacks.onDone()
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return
    callbacks.onError(err instanceof Error ? err.message : String(err))
  } finally {
    reader.releaseLock()
  }
}
