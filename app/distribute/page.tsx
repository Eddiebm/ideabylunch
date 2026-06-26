'use client'
export const runtime = 'edge'
import { useState, useRef, useCallback } from 'react'

type ParsedSection = {
  map: Channel[]
  voice: string[]
  frame: string
  hooks: Hook[]
  tiktok: VideoScript[]
  instagram: InstagramPost[]
  threads: string[]
  bluesky: string[]
  reddit: RedditPost[]
  newsletter: NewsletterBlurb | null
  indieHackers: IHPost | null
}

type Channel = { name: string; where: string; tactic: string }
type Hook = { num: number; type: string; platform: string; text: string }
type VideoScript = { num: number; format: string; hook: string; body: string; cta: string; caption: string }
type InstagramPost = { num: number; type: string; caption: string; hashtags: string; slides?: string[] }
type RedditPost = { num: number; subreddit: string; title: string; body: string }
type NewsletterBlurb = { subject: string; preview: string; body: string }
type IHPost = { title: string; body: string }

function extractField(text: string, field: string, nextFields: string[]): string {
  const nextPattern = nextFields.length ? `(?=${nextFields.map(f => `${f}:`).join('|')})` : ''
  const pattern = new RegExp(`${field}:\\s*([\\s\\S]*?)${nextPattern || '$'}`, 'i')
  return text.match(pattern)?.[1]?.replace(/^\[|\]$/g, '').trim() || ''
}

function parseOutput(raw: string): ParsedSection {
  // Distribution Map
  const map: Channel[] = []
  const mapSection = raw.match(/## DISTRIBUTION MAP([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const channelBlocks = mapSection.split(/Channel \d+:/g).slice(1)
  for (const block of channelBlocks) {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean)
    const name = lines[0]?.replace(/^\[|\]$/g, '') || ''
    const where = lines.find(l => l.startsWith('Where:'))?.replace(/^Where:\s*/, '') || ''
    const tactic = lines.find(l => l.startsWith('Tactic:'))?.replace(/^Tactic:\s*/, '') || ''
    if (name) map.push({ name, where, tactic })
  }

  // Audience Voice
  const voice: string[] = []
  const voiceSection = raw.match(/## AUDIENCE VOICE([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const voiceMatches = voiceSection.match(/"([^"]+)"/g) || []
  for (const v of voiceMatches) voice.push(v.replace(/^"|"$/g, ''))

  // Narrative Frame
  const frameSection = raw.match(/## NARRATIVE FRAME([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const frame = frameSection.replace(/^\s*\[|\]\s*$/g, '').trim()

  // 20 Hooks
  const hooks: Hook[] = []
  const hooksSection = raw.match(/## 20 HOOKS([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const hookBlocks = hooksSection.split(/Hook \d+ \|/g).slice(1)
  let hnum = 1
  for (const block of hookBlocks) {
    const firstLine = block.split('\n')[0]?.trim() || ''
    const parts = firstLine.split('|').map(s => s.trim())
    const type = parts[0] || ''
    const platform = parts[1] || ''
    const text = block.split('\n').slice(1).join('\n').replace(/^\s*\[|\]\s*$/gm, '').trim()
    if (text) hooks.push({ num: hnum++, type, platform, text })
  }

  // TikTok / Shorts Scripts
  const tiktok: VideoScript[] = []
  const tiktokSection = raw.match(/## TIKTOK[^#\n]*([\s\S]*?)(?=---\s*##|$)/i)?.[1] || ''
  const scriptBlocks = tiktokSection.split(/Script \d+\s*[—–-]+/g).slice(1)
  let snum = 1
  for (const block of scriptBlocks) {
    const format = block.split('\n')[0]?.trim() || ''
    const h = extractField(block, 'Hook', ['Body', 'CTA', 'Caption'])
    const b = extractField(block, 'Body', ['CTA', 'Caption'])
    const c = extractField(block, 'CTA', ['Caption'])
    const cap = extractField(block, 'Caption', [])
    if (h || b) tiktok.push({ num: snum++, format, hook: h, body: b, cta: c, caption: cap })
  }

  // Instagram
  const instagram: InstagramPost[] = []
  const igSection = raw.match(/## INSTAGRAM([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const igBlocks = igSection.split(/Post \d+ \|/g).slice(1)
  let pnum = 1
  for (const block of igBlocks) {
    const typeLine = block.split('\n')[0]?.trim() || ''
    const isCarousel = /carousel/i.test(typeLine)
    const caption = extractField(block, 'Caption', ['Hashtags'])
    const hashtags = extractField(block, 'Hashtags', [])
    let slides: string[] | undefined
    if (isCarousel) {
      slides = []
      const slideMatches = block.match(/Slide \d+[^:]*:\s*([^\n]+)/g) || []
      for (const s of slideMatches) {
        const text = s.replace(/Slide \d+[^:]*:\s*/i, '').trim()
        if (text) slides.push(text)
      }
    }
    instagram.push({ num: pnum++, type: typeLine, caption, hashtags, slides })
  }

  // Threads
  const threads: string[] = []
  const threadsSection = raw.match(/## THREADS([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  for (const block of threadsSection.split(/Thread \d+:/g).slice(1)) {
    const text = block.trim().replace(/^\[|\]$/g, '')
    if (text) threads.push(text)
  }

  // Bluesky
  const bluesky: string[] = []
  const bsSection = raw.match(/## BLUESKY([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  for (const block of bsSection.split(/Bluesky \d+:/g).slice(1)) {
    const text = block.trim().replace(/^\[|\]$/g, '')
    if (text) bluesky.push(text)
  }

  // Reddit
  const reddit: RedditPost[] = []
  const redditSection = raw.match(/## REDDIT([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  const redditBlocks = redditSection.split(/Post \d+ \|/g).slice(1)
  let rnum = 1
  for (const block of redditBlocks) {
    const firstLine = block.split('\n')[0]?.trim() || ''
    const subreddit = firstLine.match(/r\/([^\s]+)/)?.[1] || firstLine.replace(/r\//, '').trim()
    const title = extractField(block, 'Title', ['Body'])
    const body = extractField(block, 'Body', [])
    if (title || body) reddit.push({ num: rnum++, subreddit, title, body })
  }

  // Newsletter
  let newsletter: NewsletterBlurb | null = null
  const nlSection = raw.match(/## NEWSLETTER([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  if (nlSection.trim()) {
    const subject = extractField(nlSection, 'Subject', ['Preview', 'Body'])
    const preview = extractField(nlSection, 'Preview', ['Body'])
    const body = extractField(nlSection, 'Body', [])
    if (subject || body) newsletter = { subject, preview, body }
  }

  // Indie Hackers
  let indieHackers: IHPost | null = null
  const ihSection = raw.match(/## INDIE HACKERS([\s\S]*?)(?=---\s*##|$)/)?.[1] || ''
  if (ihSection.trim()) {
    const title = extractField(ihSection, 'Title', ['Body'])
    const body = extractField(ihSection, 'Body', [])
    if (title || body) indieHackers = { title, body }
  }

  return { map, voice, frame, hooks, tiktok, instagram, threads, bluesky, reddit, newsletter, indieHackers }
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

function CopyButton({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
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
      border: 'none', borderRadius: 6,
      padding: size === 'md' ? '6px 14px' : '4px 10px',
      fontSize: size === 'md' ? 13 : 11,
      fontWeight: 600, color: copied ? '#fff' : '#6E6E73',
      cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
      fontFamily: 'inherit',
    }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function SectionHeader({ label, color, icon }: { label: string; color: string; icon?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color }}>{label}</span>
    </div>
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

  type VideoState = { status: 'idle' | 'generating' | 'done' | 'error'; renderId?: string; url?: string; error?: string }
  const [videoStates, setVideoStates] = useState<Record<number, VideoState>>({})

  async function generateVideo(idx: number, s: VideoScript) {
    setVideoStates(prev => ({ ...prev, [idx]: { status: 'generating' } }))
    try {
      const res = await fetch('/api/generate/tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hook: s.hook, body: s.body, cta: s.cta, caption: s.caption }),
      })
      const data = await res.json()
      if (data.error) { setVideoStates(prev => ({ ...prev, [idx]: { status: 'error', error: data.error } })); return }
      const renderId = data.renderId
      setVideoStates(prev => ({ ...prev, [idx]: { status: 'generating', renderId } }))
      const poll = setInterval(async () => {
        const r = await fetch(`/api/generate/tiktok/status?id=${renderId}`)
        const d = await r.json()
        if (d.status === 'succeeded') { clearInterval(poll); setVideoStates(prev => ({ ...prev, [idx]: { status: 'done', url: d.url } })) }
        else if (d.status === 'failed') { clearInterval(poll); setVideoStates(prev => ({ ...prev, [idx]: { status: 'error', error: d.error || 'Render failed' } })) }
      }, 3000)
    } catch (err) {
      setVideoStates(prev => ({ ...prev, [idx]: { status: 'error', error: String(err) } }))
    }
  }

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
        .channel-row { border: 0.5px solid rgba(0,0,0,.08); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
        .channel-name { font-size: 14px; font-weight: 700; color: #1D1D1F; margin-bottom: 6px; }
        .channel-meta { font-size: 13px; color: #6E6E73; line-height: 1.5; }
        .channel-tactic { font-size: 13px; color: #1D1D1F; margin-top: 6px; padding-top: 6px; border-top: 0.5px solid rgba(0,0,0,.07); line-height: 1.5; }
        .hook-card { border: 0.5px solid rgba(0,0,0,.08); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
        .hook-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .hook-text { font-size: 14px; color: #1D1D1F; line-height: 1.6; white-space: pre-wrap; }
        .inner-card { border: 0.5px solid rgba(0,0,0,.09); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
        .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #AEAEB2; margin-bottom: 4px; }
        .field-text { font-size: 13px; color: #1D1D1F; line-height: 1.65; white-space: pre-wrap; }
        textarea { font-family: inherit; resize: none; }
        @media(max-width: 600px) {
          .dist-wrap { padding: 24px 16px 80px !important; }
          .dist-h1 { font-size: 26px !important; letter-spacing: -.6px !important; }
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
            One idea.<br />Every platform, ready to deploy.
          </h1>
          <p style={{ fontSize: 16, color: '#6E6E73', margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
            Enter one idea — get a channel map, audience phrases, 20 hooks, TikTok scripts, Instagram captions, Threads, Bluesky, Reddit posts, newsletter copy, and more. All written for your specific idea.
          </p>
        </div>

        {/* Input card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>
            Your idea — one concrete thought
          </label>
          <textarea
            value={idea} onChange={e => setIdea(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !busy) generate() }}
            placeholder="e.g. A weekly newsletter that helps indie founders understand their Stripe metrics without needing a data analyst"
            rows={3}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', color: '#1D1D1F', lineHeight: 1.55, transition: 'border-color .15s' }}
            onFocus={e => e.target.style.borderColor = '#0071E3'}
            onBlur={e => e.target.style.borderColor = '#D2D2D7'}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email (optional — saves 10 uses)"
              style={{ flex: '1 1 200px', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
            />
            <button
              onClick={() => generate()} disabled={busy || !idea.trim()}
              style={{ background: busy ? '#AEAEB2' : '#0071E3', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 15, fontWeight: 600, cursor: busy || !idea.trim() ? 'not-allowed' : 'pointer', transition: 'background .15s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
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
            <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 14px' }}>One idea is free. Add your email and get 10 complete distribution systems.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                onKeyDown={e => { if (e.key === 'Enter' && email.includes('@')) generate(email) }}
              />
              <button
                onClick={() => generate(email)} disabled={!email.includes('@')}
                style={{ background: '#0071E3', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Continue</button>
            </div>
          </div>
        )}

        {/* Streaming preview */}
        {streaming && !parsed && rawOutput && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,.06)', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ animation: 'pulse 1.2s ease infinite', width: 8, height: 8, borderRadius: '50%', background: '#0071E3' }} />
              <span style={{ fontSize: 13, color: '#6E6E73', fontWeight: 500 }}>Building your complete distribution system… (this takes ~30 seconds)</span>
            </div>
            <pre style={{ fontSize: 13, color: '#3C3C43', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{rawOutput}</pre>
          </div>
        )}

        {/* Results */}
        {hasResult && (
          <>
            {/* Distribution Map */}
            {parsed.map.length > 0 && (
              <div className="section-card">
                <SectionHeader label="Distribution Map" color="#0071E3" icon="🗺" />
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
                <SectionHeader label="Audience Voice — Use These Exact Words" color="#BF5AF2" icon="🎤" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {parsed.voice.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F2F2F7', borderRadius: 8, padding: '8px 12px', margin: 2 }}>
                      <span style={{ fontSize: 13, color: '#3C3C43', fontStyle: 'italic' }}>"{v}"</span>
                      <CopyButton text={v} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative Frame */}
            {parsed.frame && (
              <div className="section-card" style={{ background: '#1D1D1F' }}>
                <SectionHeader label="Narrative Frame" color="#FFD60A" />
                <p style={{ fontSize: 16, color: '#fff', lineHeight: 1.65, margin: '0 0 12px', fontStyle: 'italic' }}>"{parsed.frame}"</p>
                <CopyButton text={parsed.frame} />
              </div>
            )}

            {/* 20 Hooks */}
            {parsed.hooks.length > 0 && (
              <div className="section-card">
                <SectionHeader label="20 Hooks — Twitter/X + LinkedIn" color="#FF375F" icon="🪝" />
                {parsed.hooks.map((h, i) => {
                  const color = HOOK_TYPE_COLORS[h.type] || '#AEAEB2'
                  const isTwitter = h.platform?.toLowerCase().includes('twitter') || h.platform?.toLowerCase().includes('/x')
                  const tweetUrl = isTwitter ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(h.text)}` : null
                  return (
                    <div key={i} className="hook-card">
                      <div className="hook-meta">
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#6E6E73' }}>#{h.num}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '3px 8px', borderRadius: 5 }}>{h.type}</span>
                        <span style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 500 }}>{h.platform}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          {tweetUrl && (
                            <a href={tweetUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#000', color: '#fff', textDecoration: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>Post on X ↗</a>
                          )}
                          <CopyButton text={h.text} />
                        </div>
                      </div>
                      <div className="hook-text">{h.text}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Schedule hooks */}
            {!scheduled ? (
              <div style={{ background: '#1D1D1F', borderRadius: 16, padding: 24, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Automate the 20 hooks — one per day</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)' }}>Each hook lands in your email at noon UTC. One click to post on X.</div>
                </div>
                <button
                  onClick={scheduleAll} disabled={scheduling}
                  style={{ background: '#0071E3', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: scheduling ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
                >
                  {scheduling ? 'Scheduling…' : 'Schedule all 20 →'}
                </button>
              </div>
            ) : (
              <div style={{ background: '#30D158', borderRadius: 16, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Scheduled — starts tomorrow at noon UTC</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.85)' }}>One hook per day by email for 20 days.</div>
                </div>
                <a href={`/distribute/queue?email=${encodeURIComponent(email)}`} style={{ background: 'rgba(255,255,255,.2)', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  View queue →
                </a>
              </div>
            )}

            {/* TikTok / Shorts */}
            {parsed.tiktok.length > 0 && (
              <div className="section-card" style={{ background: '#0A0A0A' }}>
                <SectionHeader label="TikTok / YouTube Shorts Scripts" color="#FF0050" icon="🎬" />
                {parsed.tiktok.map((s, i) => (
                  <div key={i} style={{ border: '0.5px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 18, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#FF0050', background: '#FF005018', padding: '3px 9px', borderRadius: 5 }}>Script {s.num}</span>
                      {s.format && <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>{s.format}</span>}
                    </div>
                    {([
                      { label: 'Hook (0-3s)', text: s.hook, accent: '#FF0050' },
                      { label: 'Body (3-55s)', text: s.body, accent: '#00F2EA' },
                      { label: 'CTA', text: s.cta, accent: '#FFD60A' },
                      { label: 'Caption + Hashtags', text: s.caption, accent: 'rgba(255,255,255,.35)' },
                    ] as const).filter(f => f.text).map((f, fi) => (
                      <div key={fi} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: f.accent, marginBottom: 5 }}>{f.label}</div>
                        <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 6 }}>{f.text}</div>
                        <CopyButton text={f.text} />
                      </div>
                    ))}
                    <div style={{ borderTop: '0.5px solid rgba(255,255,255,.08)', paddingTop: 12, marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                        <CopyButton size="md" text={[s.hook && `HOOK: ${s.hook}`, s.body && `BODY: ${s.body}`, s.cta && `CTA: ${s.cta}`, s.caption && `CAPTION: ${s.caption}`].filter(Boolean).join('\n\n')} />
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>Copy full script</span>
                      </div>
                      {(() => {
                        const vs = videoStates[i] || { status: 'idle' }
                        if (vs.status === 'idle') return (
                          <button onClick={() => generateVideo(i, s)} style={{ background: '#FF0050', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                            🎬 Generate TikTok video
                          </button>
                        )
                        if (vs.status === 'generating') return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,0,80,.08)', border: '0.5px solid rgba(255,0,80,.2)', borderRadius: 8, padding: '10px 14px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF0050', animation: 'pulse 1.2s ease infinite' }} />
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Rendering video… ~30–60 seconds</span>
                            {vs.renderId && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginLeft: 'auto' }}>{vs.renderId.slice(0, 8)}</span>}
                          </div>
                        )
                        if (vs.status === 'done' && vs.url) return (
                          <div>
                            <video src={vs.url} controls playsInline style={{ width: '100%', maxWidth: 280, borderRadius: 10, marginBottom: 10, display: 'block' }} />
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <a href={vs.url} download="tiktok-video.mp4" style={{ background: '#FF0050', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600 }}>Download MP4</a>
                              <a href="https://www.tiktok.com/upload" target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 600 }}>Post to TikTok ↗</a>
                              <button onClick={() => generateVideo(i, s)} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,.2)', color: 'rgba(255,255,255,.5)', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Regenerate</button>
                            </div>
                          </div>
                        )
                        if (vs.status === 'error') return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,55,95,.08)', border: '0.5px solid rgba(255,55,95,.2)', borderRadius: 8, padding: '10px 14px' }}>
                            <span style={{ fontSize: 12, color: '#FF375F', flex: 1 }}>{vs.error || 'Generation failed'}</span>
                            <button onClick={() => generateVideo(i, s)} style={{ background: '#FF375F', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Retry</button>
                          </div>
                        )
                        return null
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Instagram */}
            {parsed.instagram.length > 0 && (
              <div className="section-card" style={{ background: 'linear-gradient(135deg, #833AB4 0%, #C13584 50%, #E1306C 100%)' }}>
                <SectionHeader label="Instagram" color="rgba(255,255,255,.9)" icon="📸" />
                {parsed.instagram.map((p, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,.25)', border: '0.5px solid rgba(255,255,255,.15)', borderRadius: 12, padding: 18, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.15)', padding: '3px 9px', borderRadius: 5 }}>
                        {p.type || `Post ${p.num}`}
                      </span>
                    </div>
                    {p.slides && p.slides.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>Carousel Slides</div>
                        {p.slides.map((slide, si) => (
                          <div key={si} style={{ background: 'rgba(0,0,0,.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 13, color: '#fff', lineHeight: 1.5, display: 'flex', gap: 8 }}>
                            <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.4)', fontSize: 11, minWidth: 16 }}>{si + 1}</span>
                            <span>{slide}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {p.caption && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,.5)', marginBottom: 5 }}>Caption</div>
                        <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: 6 }}>{p.caption}</div>
                        <CopyButton text={p.caption} />
                      </div>
                    )}
                    {p.hashtags && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'rgba(255,255,255,.5)', marginBottom: 5 }}>Hashtags</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', lineHeight: 1.6, marginBottom: 6 }}>{p.hashtags}</div>
                        <CopyButton text={p.hashtags} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Threads */}
            {parsed.threads.length > 0 && (
              <div className="section-card" style={{ background: '#101010' }}>
                <SectionHeader label="Threads" color="rgba(255,255,255,.65)" icon="🧵" />
                {parsed.threads.map((t, i) => (
                  <div key={i} style={{ border: '0.5px solid rgba(255,255,255,.09)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.25)', minWidth: 20 }}>{i + 1}</span>
                      <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.65, whiteSpace: 'pre-wrap', flex: 1 }}>{t}</div>
                    </div>
                    <div style={{ paddingLeft: 30 }}><CopyButton text={t} /></div>
                  </div>
                ))}
              </div>
            )}

            {/* Bluesky */}
            {parsed.bluesky.length > 0 && (
              <div className="section-card" style={{ background: '#0560FF' }}>
                <SectionHeader label="Bluesky" color="rgba(255,255,255,.9)" icon="🦋" />
                {parsed.bluesky.map((t, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,.12)', border: '0.5px solid rgba(255,255,255,.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.4)', minWidth: 20 }}>{i + 1}</span>
                      <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.65, whiteSpace: 'pre-wrap', flex: 1 }}>{t}</div>
                    </div>
                    <div style={{ paddingLeft: 30 }}><CopyButton text={t} /></div>
                  </div>
                ))}
              </div>
            )}

            {/* Reddit */}
            {parsed.reddit.length > 0 && (
              <div className="section-card">
                <SectionHeader label="Reddit" color="#FF4500" icon="👾" />
                {parsed.reddit.map((p, i) => (
                  <div key={i} className="inner-card" style={{ border: '0.5px solid rgba(255,69,0,.15)', background: '#FFF8F5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FF4500', background: '#FF450012', padding: '3px 10px', borderRadius: 5 }}>r/{p.subreddit}</span>
                    </div>
                    {p.title && (
                      <div style={{ marginBottom: 12 }}>
                        <div className="field-label">Post Title</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', lineHeight: 1.45, marginBottom: 6 }}>{p.title}</div>
                        <CopyButton text={p.title} />
                      </div>
                    )}
                    {p.body && (
                      <div>
                        <div className="field-label" style={{ marginTop: 10 }}>Body</div>
                        <div className="field-text" style={{ marginBottom: 8 }}>{p.body}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <CopyButton text={`${p.title}\n\n${p.body}`} size="md" />
                          <span style={{ fontSize: 11, color: '#AEAEB2' }}>Copy full post</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Newsletter */}
            {parsed.newsletter && (
              <div className="section-card" style={{ background: '#1E1B4B' }}>
                <SectionHeader label="Newsletter Drop" color="#A5B4FC" icon="📧" />
                <div style={{ background: 'rgba(255,255,255,.05)', border: '0.5px solid rgba(165,180,252,.2)', borderRadius: 12, padding: 18 }}>
                  {parsed.newsletter.subject && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A5B4FC', marginBottom: 5 }}>Subject Line</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{parsed.newsletter.subject}</div>
                      <CopyButton text={parsed.newsletter.subject} />
                    </div>
                  )}
                  {parsed.newsletter.preview && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A5B4FC', marginBottom: 5 }}>Preview Text</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginBottom: 6 }}>{parsed.newsletter.preview}</div>
                      <CopyButton text={parsed.newsletter.preview} />
                    </div>
                  )}
                  {parsed.newsletter.body && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: '#A5B4FC', marginBottom: 5 }}>Body</div>
                      <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.75, whiteSpace: 'pre-wrap', marginBottom: 10 }}>{parsed.newsletter.body}</div>
                      <CopyButton size="md" text={parsed.newsletter.body} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Indie Hackers */}
            {parsed.indieHackers && (
              <div className="section-card">
                <SectionHeader label="Indie Hackers Discussion Post" color="#0FA818" icon="🚀" />
                <div className="inner-card" style={{ border: '0.5px solid rgba(15,168,24,.2)', background: '#F0FFF0' }}>
                  {parsed.indieHackers.title && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="field-label">Discussion Title</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', lineHeight: 1.45, marginBottom: 6 }}>{parsed.indieHackers.title}</div>
                      <CopyButton text={parsed.indieHackers.title} />
                    </div>
                  )}
                  {parsed.indieHackers.body && (
                    <div>
                      <div className="field-label" style={{ marginTop: 10 }}>Post Body</div>
                      <div className="field-text" style={{ marginBottom: 10 }}>{parsed.indieHackers.body}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <CopyButton size="md" text={`${parsed.indieHackers.title}\n\n${parsed.indieHackers.body}`} />
                        <span style={{ fontSize: 11, color: '#AEAEB2' }}>Copy full post</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom CTA */}
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
