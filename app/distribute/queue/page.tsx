'use client'
export const runtime = 'edge'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type QueuedHook = {
  id: string
  num: number
  type: string
  platform: string
  text: string
  idea: string
  scheduledAt: number
  status: 'pending' | 'sent' | 'failed'
  sentAt?: number
}

type Meta = {
  idea: string
  startsAt: number
  total: number
  createdAt: number
}

const HOOK_COLORS: Record<string, string> = {
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
      cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
    }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function QueueContent() {
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') || '')
  const [hooks, setHooks] = useState<QueuedHook[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  async function loadQueue(e?: string) {
    const target = e || email
    if (!target.includes('@')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/distribute/queue?email=${encodeURIComponent(target)}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setHooks(data.hooks || [])
      setMeta(data.meta || null)
      setLoaded(true)
    } catch {
      setError('Failed to load queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = params.get('email') || localStorage.getItem('i2l_distribute_email') || ''
    if (saved) { setEmail(saved); loadQueue(saved) }
  }, [])

  const pending = hooks.filter(h => h.status === 'pending').length
  const sent = hooks.filter(h => h.status === 'sent').length
  const now = Date.now()

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .hook-card { background: #fff; border-radius: 14px; padding: 18px 20px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.05); animation: fadeUp .2s ease; }
        @media(max-width:600px) { .q-wrap { padding: 24px 16px 80px !important; } }
      `}</style>

      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none', letterSpacing: '-.3px' }}>IdeaByLunch</a>
        <a href="/distribute" style={{ fontSize: 13, color: '#6E6E73', textDecoration: 'none' }}>← Build new system</a>
      </nav>

      <div className="q-wrap" style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px 96px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.8px', margin: '0 0 8px' }}>Distribution Queue</h1>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: 0 }}>Your 20-day hook schedule. One email lands each day at noon UTC.</p>
        </div>

        {/* Email lookup */}
        {!loaded && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>Your email</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadQueue() }}
                placeholder="you@email.com"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                onClick={() => loadQueue()}
                disabled={loading || !email.includes('@')}
                style={{ background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {loading ? 'Loading…' : 'Load queue'}
              </button>
            </div>
            {error && <p style={{ color: '#FF375F', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
          </div>
        )}

        {/* Stats bar */}
        {loaded && hooks.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', value: hooks.length, color: '#1D1D1F' },
              { label: 'Sent', value: sent, color: '#30D158' },
              { label: 'Pending', value: pending, color: '#0071E3' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', flex: 1, minWidth: 80, boxShadow: '0 1px 3px rgba(0,0,0,.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#AEAEB2', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
            {meta?.idea && (
              <div style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', flex: 3, minWidth: 160, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Idea</div>
                <div style={{ fontSize: 13, color: '#1D1D1F', lineHeight: 1.4 }}>{meta.idea}</div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {loaded && hooks.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '40px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', marginBottom: 6 }}>No queue found</div>
            <div style={{ fontSize: 14, color: '#6E6E73', marginBottom: 20 }}>Generate a distribution system and schedule it to see your queue here.</div>
            <a href="/distribute" style={{ background: '#0071E3', color: '#fff', textDecoration: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600 }}>Build your system →</a>
          </div>
        )}

        {/* Hook timeline */}
        {hooks.map((hook, i) => {
          const color = HOOK_COLORS[hook.type] || '#AEAEB2'
          const isDue = hook.scheduledAt <= now
          const isSent = hook.status === 'sent'
          const isToday = isDue && !isSent
          const isTwitter = hook.platform?.toLowerCase().includes('twitter') || hook.platform?.toLowerCase().includes('x')
          const tweetUrl = isTwitter ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(hook.text)}` : null

          return (
            <div key={hook.id || i} className="hook-card" style={{ opacity: isSent ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#AEAEB2' }}>Day {hook.num}</span>
                <span style={{ fontSize: 12, color: '#AEAEB2' }}>·</span>
                <span style={{ fontSize: 12, color: isToday ? '#0071E3' : isSent ? '#30D158' : '#AEAEB2', fontWeight: isToday ? 700 : 400 }}>
                  {isToday ? '📤 Due today' : isSent ? `✓ Sent ${formatDate(hook.sentAt!)}` : formatDate(hook.scheduledAt)}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '3px 8px', borderRadius: 5 }}>{hook.type}</span>
                  <span style={{ fontSize: 11, color: '#AEAEB2' }}>{hook.platform}</span>
                </span>
              </div>

              <p style={{ fontSize: 14, color: '#1D1D1F', lineHeight: 1.65, margin: '0 0 12px', whiteSpace: 'pre-wrap' }}>{hook.text}</p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <CopyButton text={hook.text} />
                {tweetUrl && !isSent && (
                  <a href={tweetUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#000', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600 }}>
                    Post on X ↗
                  </a>
                )}
              </div>
            </div>
          )
        })}

        {loaded && hooks.length > 0 && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <a href="/distribute" style={{ fontSize: 13, color: '#6E6E73', textDecoration: 'none' }}>← Build a new distribution system</a>
          </div>
        )}
      </div>
    </>
  )
}

export default function QueuePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, fontFamily: 'sans-serif', color: '#6E6E73' }}>Loading…</div>}>
      <QueueContent />
    </Suspense>
  )
}
