'use client'
export const runtime = 'edge'
import { useState, useRef, useCallback } from 'react'

type ParsedSection = {
  map: Channel[]
  voice: string[]
  frame: string
  hooks: Hook[]
}

type Channel = {
  name: string
  where: string
  tactic: string
}

type Hook = {
  num: number
  type: string
  platform: string
  text: string
}

function parseOutput(raw: string): ParsedSection {
  const map: Channel[] = []
  const voice: string[] = []
  let frame = ''
  const hooks: Hook[] = []

  const mapSection = raw.match(/## DISTRIBUTION MAP([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const channelBlocks = mapSection.split(/Channel \d+:/g).slice(1)
  for (const block of channelBlocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean)
    const name = lines[0]?.replace(/^\[|\]$/g, '') || ''
    const where = lines.find(l => l.startsWith('Where:'))?.replace(/^Where:\s*/, '') || ''
    const tactic = lines.find(l => l.startsWith('Tactic:'))?.replace(/^Tactic:\s*/, '') || ''
    if (name) map.push({ name, where, tactic })
  }

  const voiceSection = raw.match(/## AUDIENCE VOICE([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const voiceMatches = voiceSection.match(/"([^"]+)"/g) || []
  for (const v of voiceMatches) voice.push(v.replace(/^"|"$/g, ''))

  const frameSection = raw.match(/## NARRATIVE FRAME([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  frame = frameSection.replace(/^\s*\[|\]\s*$/g, '').trim()

  const hooksSection = raw.match(/## 20 HOOKS([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const hookBlocks = hooksSection.split(/Hook \d+ \|/g).slice(1)
  let num = 1
  for (const block of hookBlocks) {
    const firstLine = block.split('\n')[0]?.trim() || ''
    const parts = firstLine.split('|').map(s => s.trim())
    const type = parts[0] || ''
    const platform = parts[1] || ''
    const text = block.split('\n').slice(1).join('\n')
      .replace(/^\s*\[|\]\s*$/gm, '').trim()
    if (text) hooks.push({ num: num++, type, platform, text })
  }

  return { map, voice, frame, hooks }
}

const HOOK_TYPE_COLORS: Record<string, string> = {
  'Curiosity Gap': '#0071E3',
  'Counter-Narrative': '#FF375F',
  'Confession': '#FF9F0A',
  'Hot Take': '#FF453A',
  'Data / Stat': '#30D158',
  'Before / After': '#5E5CE6',
  'Myth Bust': '#FF6B00',
  'How-To': '#00B4D8',
  'List': '#64D2FF',
  'Personal Story': '#BF5AF2',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [text])
  return (
    <button onClick={copy} style={{
      background: copied ? '#30D158' : 'rgba(0,0,0,.06)',
      border: 'none', borderRadius: 6, padding: '4px 10px',
      fontSize: 11, fontWeight: 600, color: copied ? '#fff' : '#6E6E73',
      cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
      fontFamily: 'inherit',
    }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function DistributePage() {
  const [idea, setIdea] = useState('')
  const [email, setEmail] = useState('')
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [rawOutput, setRawOutput] = useState('')
  const [parsed, setParsed] = useState<ParsedSection | null>(null)
  const [error, setError] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [scheduled, setScheduled] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function scheduleAll() {
    if (!email.includes('@')) { alert('Enter your email above to schedule hooks.'); return }
    if (!parsed?.hooks.length) return
    setScheduling(true)
    try {
      const res = await fetch('/api/distribute/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, idea, hooks: parsed.hooks }),
      })
      if (res.ok) {
        setScheduled(true)
        localStorage.setItem('i2l_distribute_email', email)
      }
    } finally {
      setScheduling(false)
    }
  }

  async function generate(overrideEmail?: string) {
    const activeEmail = overrideEmail || email
    if (!idea.trim()) return

    setLoading(true)
    setStreaming(false)
    setError('')
    setRawOutput('')
    setParsed(null)
    setShowEmailGate(false)

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({ idea: idea.trim(), email: activeEmail || undefined }),
      })

      if (res.status === 429) {
        setLoading(false)
        setShowEmailGate(true)
        return
      }

      const gateAfterStream = res.headers.get('X-Free-Remaining') === '0'
      setLoading(false)
      setStreaming(true)

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No stream')

      let buf = ''
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const p = JSON.parse(payload)
            if (p.delta?.text) {
              full += p.delta.text
              setRawOutput(full)
            }
          } catch {}
        }
      }

      setParsed(parseOutput(full))
      if (gateAfterStream) setShowEmailGate(true)
      if (activeEmail) localStorage.setItem('i2l_distribute_email', activeEmail)
    } catch (err: any) {
      if (err.name !== 'AbortError') setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  const busy = loading || streaming
  const hasResult = parsed && (parsed.map.length > 0 || parsed.hooks.length > 0)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .section-card { background: #fff; border-radius: 16px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); animation: fadeUp .3s ease; }
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 14px; }
        .channel-row { border: 0.5px solid rgba(0,0,0,.08); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
        .channel-name { font-size: 14px; font-weight: 700; color: #1D1D1F; margin-bottom: 6px; }
        .channel-meta { font-size: 13px; color: #6E6E73; line-height: 1.5; }
        .channel-tactic { font-size: 13px; color: #1D1D1F; margin-top: 6px; padding-top: 6px; border-top: 0.5px solid rgba(0,0,0,.07); line-height: 1.5; }
        .voice-chip { display: inline-block; background: #F2F2F7; border-radius: 8px; padding: 8px 12px; margin: 4px; font-size: 13px; color: #3C3C43; font-style: italic; line-height: 1.45; }
        .hook-card { border: 0.5px solid rgba(0,0,0,.08); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
        .hook-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .hook-type { font-size: 11px; font-weight: 700; letter-spacing: .05em; padding: 3px 8px; border-radius: 5px; }
        .hook-platform { font-size: 11px; color: #AEAEB2; font-weight: 500; }
        .hook-text { font-size: 14px; color: #1D1D1F; line-height: 1.6; white-space: pre-wrap; }
        textarea { font-family: inherit; resize: none; }
        @media(max-width: 600px) {
          .dist-wrap { padding: 24px 16px 80px !important; }
          .dist-h1 { font-size: 26px !important; letter-spacing: -.6px !important; }
          .dist-cols { flex-direction: column !important; }
        }
      `}</style>

      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none', letterSpacing: '-.3px' }}>IdeaByLunch</a>
        <a href="/app" style={{ fontSize: 13, color: '#6E6E73', textDecoration: 'none' }}>Launch a business →</a>
      </nav>

      <div className="dist-wrap" style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 96px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0071E3', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>✦ For marketers who build distribution</div>
          <h1 className="dist-h1" style={{ fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.2px', lineHeight: 1.15, margin: '0 0 12px' }}>
            One idea.<br />A complete distribution system.
          </h1>
          <p style={{ fontSize: 16, color: '#6E6E73', margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
            Distribution runs deeper than posting. It means knowing where attention already lives and the exact words people use to describe their problem. Enter one idea — get a channel map, 8 audience phrases, and 20 hooks ready to deploy.
          </p>
        </div>

        {/* Input card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>
            Your idea — one concrete thought
          </label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !busy) generate()
            }}
            placeholder="e.g. A weekly newsletter that helps indie founders understand their Stripe metrics without needing a data analyst"
            rows={3}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', color: '#1D1D1F', lineHeight: 1.55, transition: 'border-color .15s' }}
            onFocus={e => e.target.style.borderColor = '#0071E3'}
            onBlur={e => e.target.style.borderColor = '#D2D2D7'}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email (optional — saves 10 uses)"
              style={{ flex: '1 1 200px', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => generate()}
              disabled={busy || !idea.trim()}
              style={{
                background: busy ? '#AEAEB2' : '#0071E3',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '11px 24px', fontSize: 15, fontWeight: 600,
                cursor: busy || !idea.trim() ? 'not-allowed' : 'pointer',
                transition: 'background .15s', whiteSpace: 'nowrap', fontFamily: 'inherit',
              }}
            >
              {loading ? 'Thinking…' : streaming ? 'Building…' : 'Build distribution system'}
            </button>
          </div>

          {error && <p style={{ color: '#FF375F', fontSize: 14, marginTop: 10, marginBottom: 0 }}>{error}</p>}
        </div>

        {/* Email gate */}
        {showEmailGate && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 20, border: '1px solid #D2D2D7' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F', marginBottom: 6 }}>Enter your email for 10 free generations</div>
            <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 14px' }}>One idea is free. Add your email and get 10 distribution systems.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                onKeyDown={e => { if (e.key === 'Enter' && email.includes('@')) generate(email) }}
              />
              <button
                onClick={() => generate(email)}
                disabled={!email.includes('@')}
                style={{ background: '#0071E3', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Streaming raw output (while generating) */}
        {streaming && !parsed && rawOutput && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ animation: 'pulse 1.2s ease infinite', width: 8, height: 8, borderRadius: '50%', background: '#0071E3' }} />
              <span style={{ fontSize: 13, color: '#6E6E73', fontWeight: 500 }}>Building your distribution system…</span>
            </div>
            <pre style={{ fontSize: 13, color: '#3C3C43', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{rawOutput}</pre>
          </div>
        )}

        {/* Parsed results */}
        {hasResult && (
          <>
            {/* Distribution Map */}
            {parsed.map.length > 0 && (
              <div className="section-card">
                <div className="section-label" style={{ color: '#0071E3' }}>Distribution Map</div>
                {parsed.map.map((ch, i) => (
                  <div key={i} className="channel-row">
                    <div className="channel-name">{ch.name}</div>
                    {ch.where && <div className="channel-meta"><span style={{ fontWeight: 600, color: '#3C3C43' }}>Where: </span>{ch.where}</div>}
                    {ch.tactic && <div className="channel-tactic"><span style={{ fontWeight: 600 }}>Tactic: </span>{ch.tactic}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Audience Voice */}
            {parsed.voice.length > 0 && (
              <div className="section-card">
                <div className="section-label" style={{ color: '#BF5AF2' }}>Audience Voice — Use These Exact Words</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {parsed.voice.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F2F2F7', borderRadius: 8, padding: '8px 12px', margin: 2 }}>
                      <span className="voice-chip" style={{ background: 'none', padding: 0, margin: 0 }}>"{v}"</span>
                      <CopyButton text={v} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative Frame */}
            {parsed.frame && (
              <div className="section-card" style={{ background: '#1D1D1F' }}>
                <div className="section-label" style={{ color: '#FFD60A' }}>Narrative Frame</div>
                <p style={{ fontSize: 16, color: '#fff', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>"{parsed.frame}"</p>
                <div style={{ marginTop: 12 }}>
                  <CopyButton text={parsed.frame} />
                </div>
              </div>
            )}

            {/* 20 Hooks */}
            {parsed.hooks.length > 0 && (
              <div className="section-card">
                <div className="section-label" style={{ color: '#FF375F' }}>20 Hooks — Click to Copy</div>
                {parsed.hooks.map((h, i) => {
                  const color = HOOK_TYPE_COLORS[h.type] || '#AEAEB2'
                  return (
                    <div key={i} className="hook-card">
                      <div className="hook-meta">
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6E6E73' }}>#{h.num}</span>
                        <span className="hook-type" style={{ color, background: `${color}18` }}>{h.type}</span>
                        <span className="hook-platform">{h.platform}</span>
                        <div style={{ marginLeft: 'auto' }}>
                          <CopyButton text={h.text} />
                        </div>
                      </div>
                      <div className="hook-text">{h.text}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Schedule All */}
            {!scheduled ? (
              <div style={{ background: '#1D1D1F', borderRadius: 16, padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Automate this — schedule all 20 hooks</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>One hook lands in your email every day for 20 days. Click to post, or post directly on X.</div>
                </div>
                <button
                  onClick={scheduleAll}
                  disabled={scheduling}
                  style={{ background: '#0071E3', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: scheduling ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                >
                  {scheduling ? 'Scheduling…' : 'Schedule all 20 →'}
                </button>
              </div>
            ) : (
              <div style={{ background: '#30D158', borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Scheduled — starts tomorrow at noon</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>You'll get one hook per day by email for 20 days.</div>
                </div>
                <a href={`/distribute/queue?email=${encodeURIComponent(email)}`} style={{ background: 'rgba(255,255,255,.2)', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  View queue →
                </a>
              </div>
            )}

            {/* CTA */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>Ready to build the product too?</div>
                <div style={{ fontSize: 13, color: '#6E6E73' }}>Turn this idea into a complete product brief, tech stack, and launch plan.</div>
              </div>
              <a href="/app" style={{ background: '#0071E3', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                Build with IdeaByLunch →
              </a>
            </div>
          </>
        )}
      </div>
    </>
  )
}
