'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import WebsitePreview from './WebsitePreview'
import BuildFlow from './BuildFlow'
import PhotographySection from './PhotographySection'
import IdeaWizard from './IdeaWizard'
import EmailGate from './EmailGate'

const SYSTEM_PROMPT = `You are idea2Lunch — an elite product studio AI. Transform a raw idea into a complete, actionable product brief.

Be specific, dense, and concrete. No fluff. Write as if every word costs $50. Make bold assumptions if the idea is vague and note them clearly.

Use EXACTLY these headers in EXACTLY this order:

## PRODUCT VISION
2–3 sentences. What this is, who it's for, what outcome it delivers. End with: "[Product] is the [X] that [Y] for [Z]."

## PRODUCT PLAN
5 numbered features in build-priority order. For each: feature name — one-sentence description [recommended tech in brackets].

## PRD
5 user stories: As a [user], I want to [action] so that [outcome].
Then 5 technical requirements (performance, security, scalability).

## MARKET INTELLIGENCE
ICP: One paragraph — exact job title, company size, pain point, buying trigger, willingness to pay.
Top 3 Competitors: Name · weakness · strength.
Positioning: One sentence owning the white space.

## MARKETING COPY
Tagline: 3 options (under 8 words each)
Hero Headline: 2 options (under 12 words, outcome-focused)
Hero Subheadline: 1 option (1–2 sentences)
Value Proposition: 1 paragraph (3 sentences)
CTA Options: 3 button texts (not "Get Started" or "Learn More")

## LAUNCH STRATEGY
GTM Motion: 1 sentence (PLG/sales-led/community-led + why)
First 10 Customers: Step-by-step, specific, no generic advice
90-Day Milestones: Month 1 · Month 2 · Month 3 with specific metrics
Top 3 Channels: Ranked by ROI with reasoning

## MASTER PROMPT
A single, complete, immediately executable prompt to paste into Claude Code, Cursor, or Codex.
Open with: "You are an expert full-stack developer. Build [name] — [description]."
Include: full tech stack, every feature with acceptance criteria, database schema, API endpoints, UI/UX description, auth, deployment target.
End with: "Start by scaffolding the project, then implement in this order: [list]."

Zero preamble. Start directly with ## PRODUCT VISION.`

const SECTIONS: Record<string, { label: string; n: number }> = {
  'PRODUCT VISION':      { label: 'Vision',  n: 1 },
  'PRODUCT PLAN':        { label: 'Plan',    n: 2 },
  'PRD':                 { label: 'PRD',     n: 3 },
  'MARKET INTELLIGENCE': { label: 'Market',  n: 4 },
  'MARKETING COPY':      { label: 'Copy',    n: 5 },
  'LAUNCH STRATEGY':     { label: 'Launch',  n: 6 },
  'MASTER PROMPT':       { label: 'Prompt',  n: 7 },
}

const AGENTS = [
  { id: 'claude', label: 'Claude Code', prefix: '# Claude Code — new conversation\n\n' },
  { id: 'cursor', label: 'Cursor',      prefix: '# Cursor — Cmd+I, paste below\n\n'   },
  { id: 'codex',  label: 'Codex',       prefix: '# ChatGPT — new conversation\n\n'    },
]

function parseSections(text: string) {
  const out: { title: string; body: string }[] = []
  const re = /##\s+([A-Z][A-Z\s&]+)\s*\n([\s\S]*?)(?=\n##\s+[A-Z]|\s*$)/g
  let m
  while ((m = re.exec(text)) !== null) out.push({ title: m[1].trim(), body: m[2].trim() })
  return out.length ? out : [{ title: 'OUTPUT', body: text.trim() }]
}

function extractName(text: string): string {
  const m = text.match(/##\s+PRODUCT VISION\s*\n([^\n]+)/)
  if (m) return m[1].split(' ').slice(0, 4).join(' ')
  return 'Your Product'
}

// ── Launch Modal ───────────────────────────────────────────────────────────────
function LaunchModal({ brief, onClose }: { brief: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState('design')
  const [error, setError] = useState('')

  const plans = [
    { id: 'launch', name: 'Launch',           price: '$299',    desc: 'Built and deployed.',              note: '48 hr delivery' },
    { id: 'design', name: 'Launch + Design',  price: '$699',    desc: 'Built, designed, and polished.',   note: 'Most popular'   },
    { id: 'full',   name: 'Full Product',     price: '$1,499',  desc: 'Complete SaaS, ready to charge.',  note: 'Everything'     },
  ]

  const features: Record<string, string[]> = {
    launch: ['Complete codebase from your brief', 'Deployed to Vercel', 'GitHub repository', 'Custom subdomain', 'Delivered within 48 hours'],
    design: ['Everything in Launch', 'Custom design system', 'Branded landing page', 'Typography & color guide', 'Figma file'],
    full:   ['Everything in Launch + Design', 'Authentication (Clerk)', 'Stripe payments wired up', 'Database (Supabase)', '30 days of support'],
  }

  const handleCheckout = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected, brief }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'Checkout failed')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(24px) saturate(180%)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'rgba(255,255,255,0.96)', borderRadius: 20, maxWidth: 720, width: '100%', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.18), 0 0 0 0.5px rgba(0,0,0,.08)' }}>
        <div style={{ padding: '36px 40px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.5px', margin: '0 0 4px' }}>Launch your product.</h2>
              <p style={{ fontSize: 16, color: '#6E6E73', margin: 0 }}>We build it. We deploy it. You own it.</p>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#6E6E73', flexShrink: 0, marginTop: 4 }}>✕</button>
          </div>

          {/* Plan picker */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 28 }}>
            {plans.map(p => (
              <button key={p.id} onClick={() => setSelected(p.id)} style={{ background: selected === p.id ? '#1D1D1F' : 'rgba(0,0,0,.03)', border: selected === p.id ? '1.5px solid #1D1D1F' : '1.5px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' as const, transition: 'all .2s' }}>
                <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.04em', color: selected === p.id ? 'rgba(255,255,255,.5)' : '#6E6E73', marginBottom: 4, textTransform: 'uppercase' as const }}>{p.note}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: selected === p.id ? '#FFFFFF' : '#1D1D1F', letterSpacing: '-.3px', marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: selected === p.id ? '#FFFFFF' : '#1D1D1F', letterSpacing: '-.5px' }}>{p.price}</div>
              </button>
            ))}
          </div>

          {/* Features */}
          <div style={{ background: 'rgba(0,0,0,.03)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: '#6E6E73', marginBottom: 12 }}>What's included</div>
            {features[selected].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < features[selected].length - 1 ? 10 : 0 }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#1D1D1F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <span style={{ fontSize: 15, color: '#1D1D1F' }}>{f}</span>
              </div>
            ))}
          </div>

          {error && <div style={{ background: '#FFF2F2', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#D70015', marginBottom: 16 }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 40px 36px' }}>
          <button onClick={handleCheckout} disabled={loading} style={{ width: '100%', background: '#1D1D1F', color: '#FFFFFF', border: 'none', borderRadius: 12, padding: '16px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, transition: 'all .2s', marginBottom: 10 }}>
            {loading ? 'Redirecting…' : `Continue — ${plans.find(p => p.id === selected)?.price}`}
          </button>
          <p style={{ textAlign: 'center' as const, fontSize: 12, color: '#6E6E73', margin: 0 }}>Secure checkout via Stripe · Full code ownership · 48-hour delivery</p>
        </div>
      </div>
    </div>
  )
}

// ── Marketing line with copy button ──────────────────────────────────────────
function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const clean = text.replace(/^[\d.)−\-\s]+/, '')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#F9F9F9', borderRadius: 10, marginBottom: 6 }}>
      <span style={{ fontSize: 16, color: '#1D1D1F', fontWeight: 400, flex: 1 }}>{clean}</span>
      <button onClick={() => { navigator.clipboard.writeText(clean); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 500, color: copied ? '#30D158' : '#0066CC', cursor: 'pointer', flexShrink: 0 }}>
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  )
}

function MarketingBody({ lines, isLive }: { lines: string[]; isLive: boolean }) {
  return (
    <div>
      {lines.map((l, j) => {
        const isLabel = /^(Tagline|Hero|Value|CTA|Subheadline)/i.test(l) || l.endsWith(':')
        const isOpt = /^\d+[.)]\s|^-\s/.test(l.trim())
        if (isLabel) return <div key={j} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#6E6E73', marginTop: j > 0 ? 20 : 0, marginBottom: 8 }}>{l}</div>
        if (isOpt) return <CopyLine key={j} text={l} />
        return <p key={j} style={{ fontSize: 16, lineHeight: 1.7, color: '#6E6E73', marginBottom: 4 }}>{l}{isLive && j === lines.length - 1 && <span style={{ color: '#0066CC' }}>▌</span>}</p>
      })}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ sec, isLive, agent, setAgent, selectedAgent }: {
  sec: { title: string; body: string }
  isLive: boolean
  agent: string
  setAgent: (a: string) => void
  selectedAgent: typeof AGENTS[0]
}) {
  const [copied, setCopied] = useState(false)
  const meta = SECTIONS[sec.title] || { label: sec.title, n: 0 }
  const isMaster = sec.title === 'MASTER PROMPT'
  const isMarketing = sec.title === 'MARKETING COPY'
  const lines = sec.body.split('\n').filter(Boolean)
  const masterText = isMaster ? selectedAgent.prefix + sec.body : sec.body

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73' }}>{meta.n}</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.1px' }}>{meta.label}</span>
          {isLive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F2F2F7', borderRadius: 100, padding: '2px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#30D158', animation: 'pulse .8s ease infinite' }} />
              <span style={{ fontSize: 11, color: '#6E6E73', fontWeight: 500 }}>Writing</span>
            </div>
          )}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(masterText); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
          style={{ background: copied ? '#F2F2F7' : 'transparent', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: 500, color: copied ? '#30D158' : '#0066CC', cursor: 'pointer', transition: 'all .15s' }}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Agent selector */}
      {isMaster && (
        <div style={{ display: 'flex', gap: 4, padding: '10px 20px', background: '#F9F9F9', borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
          <span style={{ fontSize: 12, color: '#6E6E73', fontWeight: 500, alignSelf: 'center', marginRight: 4 }}>Target</span>
          {AGENTS.map(a => (
            <button key={a.id} onClick={() => setAgent(a.id)}
              style={{ background: agent === a.id ? '#1D1D1F' : 'transparent', color: agent === a.id ? '#FFFFFF' : '#1D1D1F', border: '0.5px solid', borderColor: agent === a.id ? '#1D1D1F' : 'rgba(0,0,0,.12)', borderRadius: 8, padding: '5px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '20px 24px' }}>
        {isMaster ? (
          <div style={{ background: '#F9F9F9', borderRadius: 10, padding: '16px 18px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 13, lineHeight: 1.85, color: '#1D1D1F', whiteSpace: 'pre-wrap' as const }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: '#0066CC', marginBottom: 10, paddingBottom: 10, borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
              {selectedAgent.label}
            </div>
            {sec.body}{isLive && <span style={{ color: '#0066CC' }}>▌</span>}
          </div>
        ) : isMarketing ? (
          <MarketingBody lines={lines} isLive={isLive} />
        ) : (
          <div>
            {lines.map((l, j) => {
              const isNum = /^\d+[.)]\s/.test(l)
              const isStory = l.includes('As a') || l.includes('I want to')
              const isSubLabel = /^(ICP|Top \d|Position|GTM|First|Month \d|90-Day|Channel)/i.test(l)
              const text = l.replace(/^\d+[.)]\s*/, '').replace(/^-\s*/, '')

              if (isSubLabel) return (
                <div key={j} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: '#6E6E73', marginTop: j > 0 ? 20 : 0, marginBottom: 8 }}>{l}</div>
              )
              if (isNum || isStory) return (
                <div key={j} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73' }}>{isStory ? '→' : j + 1}</span>
                  </div>
                  <span style={{ fontSize: 16, lineHeight: 1.65, color: '#1D1D1F' }}>{text}{isLive && j === lines.length - 1 && <span style={{ color: '#0066CC' }}>▌</span>}</span>
                </div>
              )
              return <p key={j} style={{ fontSize: 16, lineHeight: 1.75, color: '#1D1D1F', marginBottom: 8 }}>{l}{isLive && j === lines.length - 1 && <span style={{ color: '#0066CC' }}>▌</span>}</p>
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function BriefGenerator() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)
  const [showLaunch, setShowLaunch] = useState(false)
  const [agent, setAgent] = useState('claude')
  const [showWizard, setShowWizard] = useState(true)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const runningRef = useRef(false)

  // Restore email from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('i2l_email')
    if (saved) setUserEmail(saved)
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(56, el.scrollHeight) + 'px'
  }, [input])

  const handleGenerate = useCallback(async (overrideEmail?: string) => {
    if (!input.trim() || loading || runningRef.current) return
    runningRef.current = true
    setLoading(true); setStreaming(true); setOutput(''); setError(''); setShowLaunch(false)
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const email = overrideEmail ?? userEmail
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT, userMessage: input.trim(), email }),
      })
      if (res.status === 429) {
        // Hit rate limit — show email gate
        setLoading(false); setStreaming(false); runningRef.current = false
        setShowEmailGate(true)
        return
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6).trim()
          if (d === '[DONE]') break
          try { const t = JSON.parse(d)?.delta?.text || ''; if (t) { acc += t; setOutput(acc) } } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message || 'Something went wrong.')
    } finally { setLoading(false); setStreaming(false); runningRef.current = false }
  }, [input, loading])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleGenerate() }
  }, [handleGenerate])

  const sections = output ? parseSections(output) : []
  const productName = output ? extractName(output) : ''
  const sectionTitles = sections.map(s => s.title)
  const isDone = !streaming && sections.length >= 7
  const selectedAgent = AGENTS.find(a => a.id === agent)!

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmer {
          0% { background-position: -200% center }
          100% { background-position: 200% center }
        }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { background: #F2F2F7 !important; }
        textarea { resize: none; outline: none; }
        textarea::placeholder { color: #AEAEB2; }
        ::selection { background: rgba(0,102,204,.15); }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      {showLaunch && <LaunchModal brief={output} onClose={() => setShowLaunch(false)} />}
      {showEmailGate && (
        <EmailGate onUnlock={email => {
          setUserEmail(email)
          setShowEmailGate(false)
          handleGenerate(email)
        }} />
      )}

      <div style={{ background: '#F2F2F7', minHeight: '100vh', paddingTop: 68 }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '52px 20px 120px' }}>

          {/* Wizard — shown before first generate */}
          {showWizard && !output && !loading && (
            <div style={{ background: '#fff', borderRadius: 20, padding: '28px 28px 32px', boxShadow: '0 2px 8px rgba(0,0,0,.06)', marginBottom: 12 }}>
              <IdeaWizard
                onComplete={({ prefill }) => {
                  setInput(prefill)
                  setShowWizard(false)
                  setTimeout(() => textareaRef.current?.focus(), 50)
                }}
                onSkip={() => setShowWizard(false)}
              />
            </div>
          )}

          {/* Hero — only when wizard done and no output */}
          {!showWizard && !output && !loading && (
            <div style={{ textAlign: 'center' as const, marginBottom: 24, animation: 'fadeUp .4s ease both' }}>
              <h1 style={{ fontSize: 'clamp(32px,6vw,52px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', lineHeight: 1.08, margin: '0 0 10px' }}>
                Your idea,<br/><span style={{ color: '#0066CC' }}>fully cooked.</span>
              </h1>
              <p style={{ fontSize: 16, color: '#6E6E73', lineHeight: 1.55, maxWidth: 440, margin: '0 auto', fontWeight: 400 }}>
                Review or add to your description, then hit Cook.
              </p>
            </div>
          )}

          {/* Product name */}
          {productName && (
            <div style={{ marginBottom: 24, animation: 'fadeUp .4s ease both' }}>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.02em', color: '#6E6E73', marginBottom: 6, textTransform: 'uppercase' as const }}>Brief for</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', lineHeight: 1.1 }}>{productName}</div>

              {/* Progress */}
              <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' as const }}>
                {Object.entries(SECTIONS).map(([title, meta]) => {
                  const done = sectionTitles.includes(title)
                  return (
                    <div key={title} style={{
                      padding: '4px 10px', borderRadius: 100,
                      background: done ? '#1D1D1F' : 'rgba(0,0,0,.05)',
                      transition: 'all .35s ease',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: done ? '#FFFFFF' : '#AEAEB2', transition: 'color .35s' }}>
                        {meta.label}
                      </span>
                    </div>
                  )
                })}
                {loading && (
                  <div style={{ padding: '4px 10px', borderRadius: 100, background: 'rgba(0,102,204,.1)' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#0066CC', animation: 'pulse .8s ease infinite' }}>Writing…</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input card */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            boxShadow: '0 2px 8px rgba(0,0,0,.06), 0 0 0 0.5px rgba(0,0,0,.06)',
            marginBottom: 12,
            overflow: 'hidden',
            transition: 'box-shadow .2s',
            ...(loading ? { boxShadow: '0 0 0 2px rgba(0,102,204,.3), 0 2px 8px rgba(0,0,0,.06)' } : {}),
          }}>
            <textarea
              ref={textareaRef}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                padding: '20px 22px', fontSize: 17, lineHeight: 1.6,
                color: '#1D1D1F', minHeight: 56, display: 'block',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                fontWeight: 400, letterSpacing: '-.1px',
              }}
              placeholder="Describe your idea — e.g. a website for Mike's Plumbing in St. Louis"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 14px', borderTop: input || loading ? '0.5px solid rgba(0,0,0,.06)' : 'none' }}>
              <span style={{ fontSize: 12, color: '#AEAEB2', fontWeight: 400 }}>⌘ Return to generate</span>
              <button
                onClick={() => handleGenerate()}
                disabled={loading || !input.trim()}
                style={{
                  background: loading || !input.trim() ? 'rgba(0,0,0,.05)' : '#0066CC',
                  color: loading || !input.trim() ? '#AEAEB2' : '#FFFFFF',
                  border: 'none', borderRadius: 10, padding: '9px 20px',
                  fontSize: 15, fontWeight: 600, letterSpacing: '-.2px',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'all .2s',
                }}>
                {loading ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#AEAEB2', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                    Cooking…
                  </>
                ) : 'Cook my idea'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FFF2F2', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#D70015', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Sections */}
          {sections.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginTop: 24 }}>
              {sections.map((sec, i) => (
                <div key={sec.title} style={{ animation: `fadeUp .4s ${i * .04}s ease both` }}>
                  <Section
                    sec={sec}
                    isLive={streaming && i === sections.length - 1}
                    agent={agent}
                    setAgent={setAgent}
                    selectedAgent={selectedAgent}
                  />
                </div>
              ))}
              {streaming && sections.length === 0 && (
                <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', fontSize: 16, color: '#AEAEB2', boxShadow: '0 0 0 0.5px rgba(0,0,0,.06)' }}>
                  Cooking… <span style={{ color: '#0066CC' }}>▌</span>
                </div>
              )}
            </div>
          )}

          {/* Website Preview */}
          <WebsitePreview brief={output} productName={productName || 'Your Product'} isDone={isDone} />

          {/* Calculator + 3 Previews + Pay */}
          <BuildFlow brief={output} productName={productName || 'Your Product'} isDone={isDone} />

          {/* Photography */}
          {isDone && (
            <PhotographySection brief={output} productName={productName || 'Your Product'} isDone={isDone} />
          )}

          {/* Done CTA */}
          {isDone && (
            <div style={{ marginTop: 24, background: '#1D1D1F', borderRadius: 20, padding: '28px 28px 24px', animation: 'fadeUp .5s ease both' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>Your brief is ready</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-.5px', lineHeight: 1.2 }}>
                  Ready to go live?
                </div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', marginTop: 6, lineHeight: 1.55 }}>
                  We build, design, and deploy it. You get a live URL in 48 hours.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                <button
                  onClick={() => setShowLaunch(true)}
                  style={{ background: '#FFFFFF', color: '#1D1D1F', border: 'none', borderRadius: 12, padding: '13px 24px', fontSize: 16, fontWeight: 600, letterSpacing: '-.2px', cursor: 'pointer', flex: 1, minWidth: 160 }}>
                  Launch from $299
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(output); setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1800) }}
                  style={{ background: 'rgba(255,255,255,.1)', color: copiedAll ? '#30D158' : 'rgba(255,255,255,.7)', border: 'none', borderRadius: 12, padding: '13px 20px', fontSize: 16, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}>
                  {copiedAll ? '✓ Copied' : 'Copy brief'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
