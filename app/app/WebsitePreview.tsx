'use client'
import { useState, useEffect, useRef } from 'react'

interface Photos {
  hero: string | null
  feature: string | null
  team: string | null
  atmosphere: string | null
  cta: string | null
}

type DirectionKey = 'editorial' | 'minimal' | 'bold'
type Phase = 'idle' | 'loading' | 'done' | 'error'

interface DesignState {
  phase: Phase
  html: string
  chars: number
  error: string
}

const DIRECTION_META: Record<DirectionKey, { label: string; description: string; accent: string }> = {
  editorial: {
    label: 'Editorial',
    description: 'Warm paper, italic serif, one decisive accent — considered and unhurried',
    accent: 'oklch(60% 0.25 350)',
  },
  minimal: {
    label: 'Minimal',
    description: 'Clean, precise, generous whitespace — Stripe / Linear aesthetic',
    accent: '#0A0A0A',
  },
  bold: {
    label: 'Bold',
    description: 'Oversized type, saturated color, high-energy — impossible to ignore',
    accent: '#E85D04',
  },
}

const DIRECTION_KEYS: DirectionKey[] = ['editorial', 'minimal', 'bold']

interface WebsitePreviewProps {
  brief: string
  productName: string
  tagline?: string
  vision?: string
  isDone: boolean
  onDesignSelected?: (style: string, html: string) => void
}

function streamBuild(
  payload: object,
  style: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  signal: AbortSignal,
) {
  fetch('/api/build-website', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, style }),
    signal,
  })
    .then(async res => {
      if (!res.ok) throw new Error('Build failed')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { onDone(); return }
          try { const t = JSON.parse(data)?.delta?.text || ''; if (t) onChunk(t) } catch {}
        }
      }
      onDone()
    })
    .catch(err => { if (err.name !== 'AbortError') onError(err.message) })
}

export default function WebsitePreview({
  brief, productName, tagline, vision, isDone, onDesignSelected,
}: WebsitePreviewProps) {
  // ── Phase 1: default design ──────────────────────────────────────────────
  const [photos, setPhotos] = useState<Photos | null>(null)
  const [defaultPhase, setDefaultPhase] = useState<Phase>('idle')
  const [defaultHtml, setDefaultHtml] = useState('')
  const [defaultError, setDefaultError] = useState('')
  const defaultHtmlRef = useRef('')

  // ── Phase 2: Impeccable directions ──────────────────────────────────────
  const [showDirections, setShowDirections] = useState(false)
  const [directions, setDirections] = useState<Record<DirectionKey, DesignState>>({
    editorial: { phase: 'idle', html: '', chars: 0, error: '' },
    minimal:   { phase: 'idle', html: '', chars: 0, error: '' },
    bold:      { phase: 'idle', html: '', chars: 0, error: '' },
  })
  const dirHtmlRefs = useRef<Record<DirectionKey, string>>({ editorial: '', minimal: '', bold: '' })

  // ── Shared ───────────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState<'default' | DirectionKey | null>(null)
  const [chosen, setChosen] = useState<'default' | DirectionKey | null>(null)

  const runningRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  // Fire Phase 1 when brief is done
  useEffect(() => {
    if (!isDone || !brief || runningRef.current) return
    runningRef.current = true
    startDefault()
    return () => { abortRef.current?.abort() }
  }, [isDone])

  async function startDefault() {
    setDefaultPhase('loading')
    setDefaultError('')
    defaultHtmlRef.current = ''
    let fetchedPhotos: Photos | null = null

    try {
      const imgRes = await fetch('/api/imagery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, productName, tagline, vision }),
      })
      if (!imgRes.ok) throw new Error('imagery failed')
      const imgData = await imgRes.json()
      fetchedPhotos = imgData.photos
      setPhotos(fetchedPhotos)
    } catch { /* continue without photos */ }

    abortRef.current = new AbortController()
    const payload = { brief, productName, tagline, vision, photos: fetchedPhotos }

    streamBuild(
      payload, 'default',
      (text) => { defaultHtmlRef.current += text; setDefaultHtml(defaultHtmlRef.current) },
      () => setDefaultPhase('done'),
      (msg) => { setDefaultError(msg); setDefaultPhase('error') },
      abortRef.current.signal,
    )
  }

  // Fire Phase 2 when customer clicks "Explore directions"
  function startDirections() {
    if (!photos && defaultPhase !== 'done') return
    setShowDirections(true)
    const payload = { brief, productName, tagline, vision, photos }
    abortRef.current = new AbortController()

    DIRECTION_KEYS.forEach(key => {
      dirHtmlRefs.current[key] = ''
      patchDirection(key, { phase: 'loading', html: '', chars: 0, error: '' })

      streamBuild(
        payload, key,
        (text) => {
          dirHtmlRefs.current[key] += text
          patchDirection(key, { html: dirHtmlRefs.current[key], chars: dirHtmlRefs.current[key].length })
        },
        () => patchDirection(key, { phase: 'done', html: dirHtmlRefs.current[key] }),
        (msg) => patchDirection(key, { phase: 'error', error: msg }),
        abortRef.current!.signal,
      )
    })
  }

  function patchDirection(key: DirectionKey, patch: Partial<DesignState>) {
    setDirections(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function choose(key: 'default' | DirectionKey) {
    setChosen(key)
    const html = key === 'default' ? defaultHtmlRef.current : dirHtmlRefs.current[key as DirectionKey]
    onDesignSelected?.(key, html)
  }

  function retryDefault() {
    runningRef.current = false
    setDefaultPhase('idle')
    setTimeout(startDefault, 50)
  }

  if (!isDone) return null

  const anyDirectionLoading = DIRECTION_KEYS.some(k => directions[k].phase === 'loading')
  const anyDirectionDone    = DIRECTION_KEYS.some(k => directions[k].phase === 'done')
  const allDirectionsDone   = DIRECTION_KEYS.every(k => directions[k].phase === 'done')

  return (
    <div style={{ marginTop: 3 }}>

      {/* ── Phase 1: Default design ─────────────────────────────────────── */}
      <div style={{ background: '#111829', border: '1px solid rgba(168,192,255,.08)', borderRadius: showDirections ? '5px 5px 0 0' : 5, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#1a2236', borderBottom: '1px solid rgba(168,192,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 14 }}>🌐</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#60a5fa' }}>
              Website Preview
            </span>
            {defaultPhase === 'loading' && <Pill color="#60a5fa" label="Building your website…" pulse />}
            {defaultPhase === 'done' && !chosen && <Pill color="#4ade80" label="Ready" />}
            {chosen && <Pill color="#4ade80" label={`${chosen === 'default' ? 'This design' : DIRECTION_META[chosen as DirectionKey].label} selected`} />}
          </div>
          {defaultPhase === 'done' && (
            <button
              onClick={() => {
                const blob = new Blob([defaultHtmlRef.current], { type: 'text/html' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url
                a.download = `${(productName || 'website').toLowerCase().replace(/\s+/g, '-')}-preview.html`
                a.click(); URL.revokeObjectURL(url)
              }}
              style={{ background: 'none', border: '1px solid rgba(168,192,255,.12)', borderRadius: 3, padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 9, color: '#4a6080', cursor: 'pointer', letterSpacing: '.08em', textTransform: 'uppercase' as const }}
            >
              ↓ Download
            </button>
          )}
        </div>

        {/* Loading state */}
        {defaultPhase === 'loading' && (
          <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', boxShadow: '0 0 8px #60a5fa', animation: 'pulse 1s ease infinite', flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#8fa8cc' }}>
                {defaultHtml.length > 0 ? `Building… ${defaultHtml.length.toLocaleString()} characters` : 'Fetching photography and building your site…'}
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {defaultPhase === 'error' && (
          <div style={{ padding: '18px 20px', fontFamily: 'var(--mono)', fontSize: 11, color: '#f87171', display: 'flex', alignItems: 'center', gap: 12 }}>
            ⚠ {defaultError}
            <button onClick={retryDefault} style={{ background: 'none', border: '1px solid rgba(248,113,113,.3)', borderRadius: 3, padding: '3px 10px', fontFamily: 'var(--mono)', fontSize: 9, color: '#f87171', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {/* Preview iframe */}
        {defaultPhase === 'done' && (
          <>
            {/* Browser chrome */}
            <div style={{ background: '#0a0e1a', borderBottom: '1px solid rgba(168,192,255,.08)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {['#f87171', '#fbbf24', '#4ade80'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: .7 }} />)}
              <div style={{ flex: 1, background: '#111829', border: '1px solid rgba(168,192,255,.08)', borderRadius: 4, padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: '#4a6080' }}>
                {(productName || 'product').toLowerCase().replace(/\s+/g, '')}.com
              </div>
            </div>
            <iframe
              srcDoc={defaultHtml}
              style={{ width: '100%', height: 620, border: 'none', display: 'block' }}
              title="Website preview"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
            {/* CTA bar below preview */}
            <div style={{ background: '#0d1424', borderTop: '1px solid rgba(168,192,255,.08)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => choose('default')}
                style={{
                  padding: '8px 20px',
                  background: chosen === 'default' ? '#4ade80' : 'rgba(96,165,250,.08)',
                  border: `1px solid ${chosen === 'default' ? '#4ade80' : 'rgba(96,165,250,.2)'}`,
                  borderRadius: 4,
                  fontFamily: 'var(--mono)',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase' as const,
                  color: chosen === 'default' ? '#0a0e1a' : '#60a5fa',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                {chosen === 'default' ? '✓ This design selected' : 'Choose this design'}
              </button>
              {!showDirections && (
                <button
                  onClick={startDirections}
                  style={{
                    padding: '8px 20px',
                    background: 'none',
                    border: '1px solid rgba(168,192,255,.15)',
                    borderRadius: 4,
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    fontWeight: 600,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase' as const,
                    color: '#8fa8cc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>Explore design directions</span>
                  <span style={{ color: '#4a6080' }}>→</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Phase 2: Impeccable directions ──────────────────────────────── */}
      {showDirections && (
        <div style={{ border: '1px solid rgba(168,192,255,.08)', borderTop: 'none', borderRadius: '0 0 5px 5px', overflow: 'hidden' }}>

          {/* Directions header */}
          <div style={{ background: '#111829', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 9, borderBottom: '1px solid rgba(168,192,255,.08)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#60a5fa' }}>
              Design Directions
            </span>
            {anyDirectionLoading && <Pill color="#60a5fa" label="Building 3 directions…" pulse />}
            {allDirectionsDone && !anyDirectionLoading && <Pill color="#4ade80" label="All ready — pick one" />}
          </div>

          {/* 3-column thumbnail grid */}
          <div style={{ background: '#0d1424', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {DIRECTION_KEYS.map(key => {
              const d = directions[key]
              const meta = DIRECTION_META[key]
              const isChosen = chosen === key
              const isExpanded = expanded === key

              return (
                <div key={key} style={{
                  background: isChosen ? 'rgba(96,165,250,.06)' : '#111829',
                  border: `1px solid ${isChosen ? 'rgba(96,165,250,.4)' : isExpanded ? 'rgba(96,165,250,.2)' : 'rgba(168,192,255,.08)'}`,
                  borderRadius: 6,
                  overflow: 'hidden',
                  transition: 'all .2s',
                }}>
                  {/* Card header */}
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(168,192,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.accent, flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, color: '#e2e8f0' }}>{meta.label}</span>
                    </div>
                    {d.phase === 'loading' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', animation: 'pulse 1s ease infinite' }} />}
                    {d.phase === 'done' && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#4ade80' }}>✓ ready</span>}
                    {d.phase === 'error' && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#f87171' }}>✗</span>}
                  </div>

                  {/* Thumbnail */}
                  <div
                    style={{ position: 'relative', height: 180, overflow: 'hidden', background: '#0a0e1a', cursor: d.phase === 'done' ? 'pointer' : 'default' }}
                    onClick={() => d.phase === 'done' && setExpanded(isExpanded ? null : key)}
                  >
                    {d.phase === 'done' && d.html ? (
                      <iframe
                        srcDoc={d.html}
                        style={{ width: 1400, height: 900, border: 'none', transform: 'scale(0.257)', transformOrigin: 'top left', pointerEvents: 'none', display: 'block' }}
                        title={`${meta.label} preview`}
                        sandbox="allow-scripts allow-same-origin"
                      />
                    ) : d.phase === 'loading' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#60a5fa', opacity: .4, animation: `pulse 1.2s ease ${i * 0.2}s infinite` }} />)}
                        </div>
                        {d.chars > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#4a6080' }}>{d.chars.toLocaleString()} chars…</span>}
                      </div>
                    ) : d.phase === 'error' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#f87171' }}>Build failed</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); patchDirection(key, { phase: 'loading', html: '', chars: 0, error: '' }); dirHtmlRefs.current[key] = ''; streamBuild({ brief, productName, tagline, vision, photos }, key, (t) => { dirHtmlRefs.current[key] += t; patchDirection(key, { html: dirHtmlRefs.current[key], chars: dirHtmlRefs.current[key].length }) }, () => patchDirection(key, { phase: 'done', html: dirHtmlRefs.current[key] }), (m) => patchDirection(key, { phase: 'error', error: m }), new AbortController().signal) }}
                          style={{ background: 'none', border: '1px solid rgba(248,113,113,.3)', borderRadius: 3, padding: '3px 10px', fontFamily: 'var(--mono)', fontSize: 9, color: '#f87171', cursor: 'pointer' }}
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#4a6080' }}>Waiting…</span>
                      </div>
                    )}
                    {d.phase === 'done' && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,.7))', padding: '16px 8px 6px', textAlign: 'center' as const }}>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: '#8fa8cc', letterSpacing: '.1em' }}>
                          {isExpanded ? 'CLICK TO COLLAPSE' : 'CLICK TO EXPAND'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description + choose */}
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#4a6080', lineHeight: 1.5, margin: '0 0 10px' }}>{meta.description}</p>
                    {d.phase === 'done' && (
                      <button
                        onClick={() => choose(key)}
                        style={{
                          width: '100%', padding: '7px 0',
                          background: isChosen ? '#4ade80' : 'rgba(96,165,250,.08)',
                          border: `1px solid ${isChosen ? '#4ade80' : 'rgba(96,165,250,.2)'}`,
                          borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                          letterSpacing: '.08em', textTransform: 'uppercase' as const,
                          color: isChosen ? '#0a0e1a' : '#60a5fa', cursor: 'pointer', transition: 'all .15s',
                        }}
                      >
                        {isChosen ? '✓ Selected' : 'Choose this design'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Expanded full preview */}
          {expanded && expanded !== 'default' && directions[expanded].phase === 'done' && (
            <div style={{ borderTop: '1px solid rgba(168,192,255,.08)' }}>
              <div style={{ background: '#0a0e1a', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                {['#f87171', '#fbbf24', '#4ade80'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: .7 }} />)}
                <div style={{ flex: 1, background: '#111829', border: '1px solid rgba(168,192,255,.08)', borderRadius: 4, padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: '#4a6080' }}>
                  {(productName || 'product').toLowerCase().replace(/\s+/g, '')}.com — {DIRECTION_META[expanded].label}
                </div>
                <button
                  onClick={() => choose(expanded)}
                  style={{
                    padding: '5px 16px',
                    background: chosen === expanded ? '#4ade80' : '#60a5fa',
                    border: 'none', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                    letterSpacing: '.08em', textTransform: 'uppercase' as const,
                    color: '#0a0e1a', cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  }}
                >
                  {chosen === expanded ? '✓ Selected' : `Choose ${DIRECTION_META[expanded].label} →`}
                </button>
              </div>
              <iframe
                srcDoc={directions[expanded].html}
                style={{ width: '100%', height: 640, border: 'none', display: 'block' }}
                title={`${DIRECTION_META[expanded].label} full preview`}
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Pill({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 3, padding: '2px 8px' }}>
      {pulse && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: 'pulse 1s ease infinite' }} />}
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color }}>{label}</span>
    </div>
  )
}
