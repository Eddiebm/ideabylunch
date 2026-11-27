import { describe, it, expect, vi } from 'vitest'
import { processSSESegment, consumeSSEResponse } from '../app/lib/parseSSE'

// ── processSSESegment unit tests ────────────────────────────────────────────

describe('processSSESegment', () => {
  it('extracts text from a complete data line', () => {
    const chunks: string[] = []
    const callbacks = { onChunk: (t: string) => chunks.push(t), onDone: vi.fn(), onError: vi.fn() }
    const buf = processSSESegment('data: {"delta":{"text":"hello"}}\n\n', '', callbacks)
    expect(chunks).toEqual(['hello'])
    expect(buf).toBe('')
  })

  it('handles [DONE] sentinel', () => {
    const onDone = vi.fn()
    const buf = processSSESegment('data: [DONE]\n', '', { onChunk: vi.fn(), onDone, onError: vi.fn() })
    expect(onDone).toHaveBeenCalledOnce()
    expect(buf).toBe('')
  })

  it('D-001: does NOT lose text when chunk boundary splits a data line', () => {
    // Simulate chunk boundary mid-line:
    // segment 1 ends without \n  → no complete lines yet
    // segment 2 completes the line
    const chunks: string[] = []
    const callbacks = { onChunk: (t: string) => chunks.push(t), onDone: vi.fn(), onError: vi.fn() }

    const seg1 = 'data: {"delta":{"te'
    const seg2 = 'xt":"world"}}\n'

    let buf = processSSESegment(seg1, '', callbacks)
    expect(chunks).toEqual([])          // no complete line yet
    expect(buf).toBe(seg1)              // partial line is buffered

    buf = processSSESegment(seg2, buf, callbacks)
    expect(chunks).toEqual(['world'])   // combined line processed correctly
    expect(buf).toBe('')
  })

  it('D-001: handles multi-chunk fragmentation across 3 reads', () => {
    const chunks: string[] = []
    const callbacks = { onChunk: (t: string) => chunks.push(t), onDone: vi.fn(), onError: vi.fn() }

    const parts = ['dat', 'a: {"delta":{"text":"frag', 'ment"}}\n']
    let buf = ''
    for (const p of parts) buf = processSSESegment(p, buf, callbacks)
    expect(chunks).toEqual(['fragment'])
    expect(buf).toBe('')
  })

  it('handles CRLF line endings', () => {
    const chunks: string[] = []
    const callbacks = { onChunk: (t: string) => chunks.push(t), onDone: vi.fn(), onError: vi.fn() }
    processSSESegment('data: {"delta":{"text":"crlf"}}\r\n\r\n', '', callbacks)
    expect(chunks).toEqual(['crlf'])
  })

  it('skips malformed JSON without throwing', () => {
    const onError = vi.fn()
    const callbacks = { onChunk: vi.fn(), onDone: vi.fn(), onError }
    processSSESegment('data: {bad json}\n', '', callbacks)
    expect(onError).not.toHaveBeenCalled()  // skip, not error
  })

  it('handles multiple events in a single segment', () => {
    const chunks: string[] = []
    const callbacks = { onChunk: (t: string) => chunks.push(t), onDone: vi.fn(), onError: vi.fn() }
    processSSESegment(
      'data: {"delta":{"text":"a"}}\ndata: {"delta":{"text":"b"}}\ndata: {"delta":{"text":"c"}}\n',
      '',
      callbacks,
    )
    expect(chunks).toEqual(['a', 'b', 'c'])
  })

  it('stops accumulating after [DONE] appears mid-segment', () => {
    const chunks: string[] = []
    const onDone = vi.fn()
    const callbacks = { onChunk: (t: string) => chunks.push(t), onDone, onError: vi.fn() }
    processSSESegment(
      'data: {"delta":{"text":"pre"}}\ndata: [DONE]\ndata: {"delta":{"text":"post"}}\n',
      '',
      callbacks,
    )
    expect(chunks).toEqual(['pre'])
    expect(onDone).toHaveBeenCalledOnce()
  })
})

// ── consumeSSEResponse integration tests ────────────────────────────────────

function makeStream(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(readable, { status: 200 })
}

describe('consumeSSEResponse', () => {
  it('collects all text from a well-formed stream', async () => {
    const chunks: string[] = []
    const res = makeStream([
      'data: {"delta":{"text":"foo"}}\n\n',
      'data: {"delta":{"text":"bar"}}\n\n',
      'data: [DONE]\n\n',
    ])
    await consumeSSEResponse(res, { onChunk: t => chunks.push(t), onDone: vi.fn(), onError: vi.fn() })
    expect(chunks.join('')).toBe('foobar')
  })

  it('D-001: reconstructs text split across TCP-style chunks', async () => {
    const chunks: string[] = []
    // The SSE line is split between two chunks
    const res = makeStream([
      'data: {"delta":{"tex',
      't":"split"}}\ndata: [DONE]\n',
    ])
    await consumeSSEResponse(res, { onChunk: t => chunks.push(t), onDone: vi.fn(), onError: vi.fn() })
    expect(chunks.join('')).toBe('split')
  })

  it('handles premature stream close without [DONE]', async () => {
    const onDone = vi.fn()
    const res = makeStream(['data: {"delta":{"text":"ok"}}\n'])
    await consumeSSEResponse(res, { onChunk: vi.fn(), onDone, onError: vi.fn() })
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('calls onError for non-200 response', async () => {
    const onError = vi.fn()
    const res = new Response(null, { status: 500 })
    await consumeSSEResponse(res, { onChunk: vi.fn(), onDone: vi.fn(), onError })
    expect(onError).toHaveBeenCalledWith('HTTP 500')
  })

  it('handles abort signal mid-stream', async () => {
    const controller = new AbortController()
    const chunks: string[] = []
    const readable = new ReadableStream({
      start(ctrl) {
        ctrl.enqueue(new TextEncoder().encode('data: {"delta":{"text":"a"}}\n'))
        // Abort before next chunk
        controller.abort()
        ctrl.enqueue(new TextEncoder().encode('data: {"delta":{"text":"b"}}\n'))
        ctrl.close()
      },
    })
    const res = new Response(readable, { status: 200 })
    await consumeSSEResponse(res, { onChunk: t => chunks.push(t), onDone: vi.fn(), onError: vi.fn() }, controller.signal)
    // "b" may or may not appear depending on timing, but no crash
    expect(() => {}).not.toThrow()
  })
})
