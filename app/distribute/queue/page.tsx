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
  autoPosted?: boolean
}

type Meta = { idea: string; startsAt: number; total: number; createdAt: number }

type ConnStatus = { connected: boolean; handle?: string }
type AllConnStatus = { bluesky: ConnStatus; twitter: ConnStatus; linkedin: ConnStatus; threads: ConnStatus }

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

function platColor(p: string) {
  const s = p.toLowerCase()
  if (s.includes('twitter') || s.includes('/x')) return '#000'
  if (s.includes('linkedin')) return '#0A66C2'
  if (s.includes('bluesky')) return '#0560FF'
  if (s.includes('threads')) return '#101010'
  return '#AEAEB2'
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

// ─── Bluesky connect form ───────────────────────────────────────────────────
function BlueskyForm({ email, onConnected }: { email: string; onConnected: (handle: string) => void }) {
  const [identifier, setIdentifier] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function connect() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/connect/bluesky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, identifier, appPassword }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      onConnected(data.handle)
    } catch {
      setError('Connection failed — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 12, background: 'rgba(5,96,255,.05)', border: '0.5px solid rgba(5,96,255,.2)', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#0560FF', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
        Bluesky App Password
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
          placeholder="your-handle.bsky.social"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <input
          type="password" value={appPassword} onChange={e => setAppPassword(e.target.value)}
          placeholder="xxxx-xxxx-xxxx-xxxx (App Password)"
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <div style={{ fontSize: 11, color: '#AEAEB2' }}>
          Generate at Bluesky → Settings → App Passwords. Your main password is never stored.
        </div>
        <button
          onClick={connect} disabled={loading || !identifier || !appPassword}
          style={{ background: '#0560FF', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
        >
          {loading ? 'Connecting…' : 'Connect Bluesky'}
        </button>
        {error && <div style={{ fontSize: 12, color: '#FF375F' }}>{error}</div>}
      </div>
    </div>
  )
}

// ─── Connect Accounts panel ──────────────────────────────────────────────────
function ConnectPanel({ email, status, onRefresh }: {
  email: string
  status: AllConnStatus
  onRefresh: () => void
}) {
  const [showBskyForm, setShowBskyForm] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  async function disconnect(platform: string) {
    setDisconnecting(platform)
    try {
      if (platform === 'bluesky') {
        await fetch('/api/connect/bluesky', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      } else {
        await fetch(`/api/connect/${platform}?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
      }
      onRefresh()
    } finally {
      setDisconnecting(null)
    }
  }

  const platforms = [
    {
      id: 'twitter',
      label: 'Twitter / X',
      icon: '𝕏',
      color: '#000',
      bg: '#F2F2F7',
      oauthUrl: `/api/connect/twitter?email=${encodeURIComponent(email)}`,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      icon: 'in',
      color: '#0A66C2',
      bg: '#EBF3FF',
      oauthUrl: `/api/connect/linkedin?email=${encodeURIComponent(email)}`,
    },
    {
      id: 'bluesky',
      label: 'Bluesky',
      icon: '🦋',
      color: '#0560FF',
      bg: '#EBF1FF',
      oauthUrl: null,
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: '🧵',
      color: '#101010',
      bg: '#F2F2F7',
      oauthUrl: `/api/connect/threads?email=${encodeURIComponent(email)}`,
    },
  ] as const

  const allConnected = platforms.every(p => status[p.id as keyof AllConnStatus]?.connected)

  return (
    <div id="connect" style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1F' }}>
            {allConnected ? '✅ All platforms connected' : 'Connect platforms for auto-posting'}
          </div>
          <div style={{ fontSize: 13, color: '#6E6E73', marginTop: 2 }}>
            Connected platforms are posted to automatically at noon UTC. Others are emailed.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {platforms.map(p => {
          const conn = status[p.id as keyof AllConnStatus]
          const isDisconnecting = disconnecting === p.id
          return (
            <div key={p.id} style={{ border: `0.5px solid ${conn.connected ? p.color + '30' : 'rgba(0,0,0,.08)'}`, borderRadius: 12, padding: '12px 16px', background: conn.connected ? p.bg : '#fff', transition: 'all .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.color, minWidth: 20, textAlign: 'center' }}>{p.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>{p.label}</div>
                  {conn.connected && conn.handle && (
                    <div style={{ fontSize: 11, color: '#6E6E73', marginTop: 1 }}>@{conn.handle}</div>
                  )}
                </div>
                {conn.connected ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#30D158', background: '#30D15818', padding: '3px 8px', borderRadius: 5 }}>Auto-posting</span>
                    <button
                      onClick={() => disconnect(p.id)}
                      disabled={isDisconnecting}
                      style={{ fontSize: 11, color: '#AEAEB2', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', fontFamily: 'inherit' }}
                    >
                      {isDisconnecting ? '…' : 'Disconnect'}
                    </button>
                  </div>
                ) : (
                  p.oauthUrl ? (
                    <a href={p.oauthUrl} style={{ background: p.color, color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Connect
                    </a>
                  ) : (
                    <button
                      onClick={() => setShowBskyForm(v => !v)}
                      style={{ background: p.color, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      {showBskyForm ? 'Cancel' : 'Connect'}
                    </button>
                  )
                )}
              </div>
              {p.id === 'bluesky' && showBskyForm && !conn.connected && (
                <BlueskyForm email={email} onConnected={() => { setShowBskyForm(false); onRefresh() }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main queue content ──────────────────────────────────────────────────────
function QueueContent() {
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') || '')
  const [hooks, setHooks] = useState<QueuedHook[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [connStatus, setConnStatus] = useState<AllConnStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  async function loadQueue(e?: string) {
    const target = e || email
    if (!target.includes('@')) return
    setLoading(true)
    setError('')
    try {
      const [queueRes, statusRes] = await Promise.all([
        fetch(`/api/distribute/queue?email=${encodeURIComponent(target)}`),
        fetch(`/api/connect/status?email=${encodeURIComponent(target)}`),
      ])
      const queueData = await queueRes.json()
      const statusData = await statusRes.json()
      if (queueData.error) { setError(queueData.error); return }
      setHooks(queueData.hooks || [])
      setMeta(queueData.meta || null)
      setConnStatus(statusData.status || null)
      setLoaded(true)
    } catch {
      setError('Failed to load queue.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshStatus() {
    if (!email.includes('@')) return
    const res = await fetch(`/api/connect/status?email=${encodeURIComponent(email)}`)
    const data = await res.json()
    if (data.status) setConnStatus(data.status)
  }

  useEffect(() => {
    const saved = params.get('email') || localStorage.getItem('i2l_distribute_email') || ''
    if (saved) { setEmail(saved); loadQueue(saved) }

    const connected = params.get('connected')
    if (connected) {
      setToast(`✅ ${connected.charAt(0).toUpperCase() + connected.slice(1)} connected — posts will be auto-published`)
      setTimeout(() => setToast(''), 5000)
    }
    const err = params.get('error')
    if (err) {
      setToast(`Connection failed (${err}) — try again`)
      setTimeout(() => setToast(''), 5000)
    }
  }, [])

  const pending = hooks.filter(h => h.status === 'pending').length
  const sent = hooks.filter(h => h.status === 'sent').length
  const autoPosted = hooks.filter(h => h.autoPosted).length
  const now = Date.now()

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .hook-card { background: #fff; border-radius: 14px; padding: 18px 20px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.05); animation: fadeUp .2s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .toast { animation: slideIn .3s ease; }
        @media(max-width:600px) { .q-wrap { padding: 24px 16px 80px !important; } }
      `}</style>

      {toast && (
        <div className="toast" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1D1D1F', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 500, zIndex: 1000, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
          {toast}
        </div>
      )}

      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none', letterSpacing: '-.3px' }}>IdeaByLunch</a>
        <a href="/distribute" style={{ fontSize: 13, color: '#6E6E73', textDecoration: 'none' }}>← Build new system</a>
      </nav>

      <div className="q-wrap" style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px 96px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.8px', margin: '0 0 8px' }}>Distribution Queue</h1>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: 0 }}>Your scheduled posts. Connect accounts for auto-posting.</p>
        </div>

        {/* Email lookup */}
        {!loaded && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 8 }}>Your email</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadQueue() }}
                placeholder="you@email.com"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
              />
              <button
                onClick={() => loadQueue()} disabled={loading || !email.includes('@')}
                style={{ background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                {loading ? 'Loading…' : 'Load queue'}
              </button>
            </div>
            {error && <p style={{ color: '#FF375F', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}
          </div>
        )}

        {/* Connect Accounts */}
        {loaded && connStatus && (
          <ConnectPanel email={email} status={connStatus} onRefresh={refreshStatus} />
        )}

        {/* Stats bar */}
        {loaded && hooks.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', value: hooks.length, color: '#1D1D1F' },
              { label: 'Sent', value: sent, color: '#30D158' },
              { label: 'Auto-posted', value: autoPosted, color: '#0071E3' },
              { label: 'Pending', value: pending, color: '#FF9F0A' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 18px', flex: 1, minWidth: 72, boxShadow: '0 1px 3px rgba(0,0,0,.05)', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#AEAEB2', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
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
          const color = HOOK_COLORS[hook.type] || platColor(hook.platform)
          const isDue = hook.scheduledAt <= now
          const isSent = hook.status === 'sent'
          const isToday = isDue && !isSent
          const pl = (hook.platform || '').toLowerCase()
          const isTwitter = pl.includes('twitter') || pl.includes('/x')
          const tweetUrl = isTwitter && !hook.autoPosted ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(hook.text)}` : null

          return (
            <div key={hook.id || i} className="hook-card" style={{ opacity: isSent ? 0.65 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2' }}>Day {hook.num}</span>
                <span style={{ fontSize: 11, color: '#AEAEB2' }}>·</span>
                <span style={{ fontSize: 11, color: isToday ? '#0071E3' : isSent ? '#30D158' : '#AEAEB2', fontWeight: isToday ? 700 : 400 }}>
                  {isToday ? '📤 Due today' : isSent
                    ? (hook.autoPosted ? `🤖 Auto-posted ${formatDate(hook.sentAt!)}` : `✓ Sent ${formatDate(hook.sentAt!)}`)
                    : formatDate(hook.scheduledAt)}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {hook.type && <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '3px 8px', borderRadius: 5 }}>{hook.type}</span>}
                  <span style={{ fontSize: 11, color: platColor(hook.platform), fontWeight: 600, background: platColor(hook.platform) + '12', padding: '3px 8px', borderRadius: 5 }}>{hook.platform}</span>
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
