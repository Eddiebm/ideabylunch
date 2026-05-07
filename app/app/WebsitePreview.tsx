'use client'
import { useState, useEffect, useRef } from 'react'

interface Photos {
  hero: string | null
  feature: string | null
  team: string | null
  atmosphere: string | null
  cta: string | null
}

interface WebsitePreviewProps {
  brief: string
  productName: string
  tagline?: string
  vision?: string
  isDone: boolean
}

export default function WebsitePreview({ brief, productName, tagline, vision, isDone }: WebsitePreviewProps) {
  const [phase, setPhase] = useState<'idle'|'photos'|'building'|'done'|'error'>('idle')
  const [photos, setPhotos] = useState<Photos | null>(null)
  const [aiPrompts, setAiPrompts] = useState<Record<string, string>>({})
  const [htmlOutput, setHtmlOutput] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'preview'|'photos'|'prompts'|'code'>('preview')
  const [copied, setCopied] = useState(false)
  const htmlRef = useRef('')
  const runningRef = useRef(false) // Guard against double-fire in React 18 strict mode

  useEffect(() => {
    if (!isDone || !brief || phase !== 'idle') return
    if (runningRef.current) return // Already running — don't fire twice
    runningRef.current = true
    startGeneration()
  }, [isDone])

  async function startGeneration() {
    setPhase('photos')
    setError('')
    htmlRef.current = ''

    try {
      // Step 1: Get industry-specific photos and AI prompts
      const imgRes = await fetch('/api/imagery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, productName, tagline, vision })
      })
      if (!imgRes.ok) throw new Error('Failed to fetch imagery')
      const imgData = await imgRes.json()
      setPhotos(imgData.photos)
      setAiPrompts(imgData.aiPrompts || {})

      // Step 2: Build website using those photos
      setPhase('building')

      const buildRes = await fetch('/api/build-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          productName,
          tagline,
          vision,
          photos: imgData.photos,
          industry: imgData.industry
        })
      })
      if (!buildRes.ok) throw new Error('Failed to build website')

      const reader = buildRes.body!.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const d = JSON.parse(data)?.delta?.text || ''
            if (d) { acc += d; setHtmlOutput(acc) }
          } catch {}
        }
      }

      htmlRef.current = acc
      setPhase('done')
    } catch (e: any) {
      setError(e.message)
      setPhase('error')
      runningRef.current = false // Allow retry
    }
  }

  function downloadHTML() {
    const html = htmlRef.current || htmlOutput
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(productName || 'website').toLowerCase().replace(/\s+/g, '-')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const iframeSrcDoc = phase === 'done' ? (htmlRef.current || htmlOutput) : ''
  const phaseColor = { idle: '#4a6080', photos: '#c8ff00', building: '#60a5fa', done: '#4ade80', error: '#f87171' }[phase]
  const phaseLabel = { idle: '', photos: 'Sourcing photography…', building: 'Building website…', done: 'Website ready', error: 'Error' }[phase]

  if (!isDone) return null

  return (
    <div style={{ background: '#111829', border: '1px solid rgba(168,192,255,.08)', borderRadius: 5, overflow: 'hidden', borderLeft: '3px solid #60a5fa', marginTop: 3 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', background: '#1a2236', borderBottom: '1px solid rgba(168,192,255,.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 14 }}>🌐</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#60a5fa', opacity: .9 }}>WEBSITE PREVIEW</span>
          {phase !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: `${phaseColor}12`, border: `1px solid ${phaseColor}33`, borderRadius: 3, padding: '2px 8px' }}>
              {(phase === 'photos' || phase === 'building') && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: phaseColor, animation: 'pulse 1s ease infinite' }} />
              )}
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: phaseColor }}>{phaseLabel}</span>
            </div>
          )}
        </div>

        {phase === 'done' && (
          <div style={{ display: 'flex', gap: 6 }}>
            {(['preview', 'photos', 'prompts', 'code'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ background: activeTab === tab ? 'rgba(96,165,250,.08)' : 'none', border: `1px solid ${activeTab === tab ? 'rgba(96,165,250,.3)' : 'rgba(168,192,255,.08)'}`, borderRadius: 3, padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: activeTab === tab ? '#60a5fa' : '#4a6080', cursor: 'pointer', transition: 'all .15s' }}>
                {tab}
              </button>
            ))}
            <button onClick={downloadHTML}
              style={{ background: '#60a5fa', color: '#0a0e1a', border: 'none', borderRadius: 3, padding: '4px 14px', fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase' as const, cursor: 'pointer', marginLeft: 4 }}>
              ↓ Download
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '18px 20px', fontFamily: 'var(--mono)', fontSize: 11, color: '#f87171' }}>
          ⚠ {error}
          <button onClick={() => { runningRef.current = false; setPhase('idle'); setTimeout(startGeneration, 100) }}
            style={{ marginLeft: 12, background: 'none', border: '1px solid rgba(248,113,113,.3)', borderRadius: 3, padding: '3px 10px', fontFamily: 'var(--mono)', fontSize: 9, color: '#f87171', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {(phase === 'photos' || phase === 'building') && (
        <div style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: phase === 'photos' ? '#c8ff00' : '#4ade80', boxShadow: phase === 'photos' ? '0 0 8px #c8ff00' : 'none', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#8fa8cc' }}>
              {phase === 'photos' ? 'Identifying industry · sourcing specific photography…' : '✓ Photography ready — industry-matched images loaded'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 3, background: phase === 'building' ? '#60a5fa' : '#1a2236', boxShadow: phase === 'building' ? '0 0 8px #60a5fa' : 'none', flexShrink: 0 }} />
            <div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: phase === 'building' ? '#8fa8cc' : '#4a6080', display: 'block', marginBottom: 6 }}>
                {phase === 'building' ? 'Building your photo-rich website…' : 'Waiting to build…'}
              </span>
              {phase === 'building' && htmlOutput.length > 0 && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#4a6080', background: '#0a0e1a', border: '1px solid rgba(168,192,255,.06)', borderRadius: 4, padding: '6px 10px' }}>
                  {htmlOutput.length.toLocaleString()} characters generated…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview tab */}
      {phase === 'done' && activeTab === 'preview' && (
        <div>
          <div style={{ background: '#0a0e1a', borderBottom: '1px solid rgba(168,192,255,.08)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {['#f87171', '#fbbf24', '#4ade80'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: .7 }} />)}
            <div style={{ flex: 1, background: '#111829', border: '1px solid rgba(168,192,255,.08)', borderRadius: 4, padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 10, color: '#4a6080' }}>
              {(productName || 'product').toLowerCase().replace(/\s+/g, '')}.com — live preview
            </div>
          </div>
          <iframe
            srcDoc={iframeSrcDoc}
            style={{ width: '100%', height: 620, border: 'none', display: 'block' }}
            title="Website preview"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      )}

      {/* Photos tab */}
      {phase === 'done' && activeTab === 'photos' && photos && (
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#4a6080', marginBottom: 14 }}>
            Industry-matched photography embedded in your website
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {Object.entries(photos).filter(([_, url]) => url).map(([key, url]) => (
              <div key={key} style={{ borderRadius: 4, overflow: 'hidden' }}>
                <img src={url!} alt={key} style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '5px 8px', fontFamily: 'var(--mono)', fontSize: 9, color: '#60a5fa', textTransform: 'uppercase' as const, letterSpacing: '.08em', background: '#1a2236' }}>{key}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#1a2236', border: '1px solid rgba(168,192,255,.06)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, color: '#4a6080', lineHeight: 1.7 }}>
            ✦ Photos from <a href="https://unsplash.com?utm_source=ideabylunch&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ color: '#c8ff00', textDecoration: 'none' }}>Unsplash</a> — free for commercial use.
          </div>
        </div>
      )}

      {/* Prompts tab */}
      {phase === 'done' && activeTab === 'prompts' && (
        <div style={{ padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#4a6080', marginBottom: 14 }}>
            Custom AI image prompts — paste into Midjourney or DALL-E 3
          </div>
          {Object.entries(aiPrompts).map(([key, prompt]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#c8ff00', letterSpacing: '.12em', textTransform: 'uppercase' as const, marginBottom: 6 }}>{key}</div>
              <div style={{ background: '#0a0e1a', border: '1px solid rgba(168,192,255,.08)', borderRadius: 4, padding: '12px 14px', fontFamily: 'var(--body)', fontSize: 13, color: '#8fa8cc', lineHeight: 1.7 }}>{prompt}</div>
            </div>
          ))}
        </div>
      )}

      {/* Code tab */}
      {phase === 'done' && activeTab === 'code' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#0a0e1a', borderBottom: '1px solid rgba(168,192,255,.08)' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#4a6080' }}>
              {(productName || 'website').toLowerCase().replace(/\s+/g, '-')}.html · {Math.round((htmlRef.current || htmlOutput).length / 1024)}kb
            </span>
            <button onClick={() => { navigator.clipboard.writeText(htmlRef.current || htmlOutput); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
              style={{ background: copied ? 'rgba(74,222,128,.08)' : 'none', border: `1px solid ${copied ? '#4ade80' : 'rgba(168,192,255,.08)'}`, borderRadius: 3, padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 9, color: copied ? '#4ade80' : '#4a6080', cursor: 'pointer', transition: 'all .15s' }}>
              {copied ? '✓ Copied' : 'Copy all'}
            </button>
          </div>
          <div style={{ background: '#0a0e1a', fontFamily: 'var(--mono)', fontSize: 11, color: '#60a5fa', lineHeight: 1.7, padding: '16px 18px', maxHeight: 500, overflowY: 'auto', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const }}>
            {(htmlRef.current || htmlOutput).slice(0, 3000)}…
          </div>
        </div>
      )}

    </div>
  )
}
