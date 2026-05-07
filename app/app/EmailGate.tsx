'use client'
import { useState, useEffect } from 'react'

interface Props {
  onUnlock: (email: string) => void
  onDismiss?: () => void
}

export default function EmailGate({ onUnlock, onDismiss }: Props) {
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const utmSource = params.get('utm_source') || params.get('ref') || ''
    const ref = document.referrer
      ? new URL(document.referrer).hostname.replace('www.', '')
      : ''
    localStorage.setItem('i2l_source', utmSource || ref || 'direct')
  }, [])

  async function submit() {
    if (!email.includes('@')) return
    setLoading(true)
    setError('')
    try {
      const src = localStorage.getItem('i2l_source') || source || 'direct'
      localStorage.setItem('i2l_email', email)
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: src }),
      }).catch(() => {})
      onUnlock(email)
    } catch {
      setError('Something went wrong. Try again.')
      setLoading(false)
    }
  }

  const SOURCES = ['Google', 'Instagram', 'Facebook', 'Friend/Referral', 'LinkedIn', 'Other']

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFF8EE 0%, #FFE9C7 100%)',
      borderRadius: 20,
      padding: '24px 28px',
      boxShadow: '0 4px 16px rgba(0,0,0,.06), 0 0 0 0.5px rgba(0,0,0,.06)',
      marginBottom: 16,
      animation: 'fadeUp .4s ease both',
      position: 'relative',
    }}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,.06)', border: 'none', borderRadius: '50%', width: 26, height: 26, fontSize: 16, color: '#1D1D1F', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}
        >×</button>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#0066CC', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            ✦ You hit the free limit
          </div>
          <h3 style={{ fontSize: 19, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.4px', margin: '0 0 6px', lineHeight: 1.25 }}>
            Drop your email — unlock 12 more briefs.
          </h3>
          <p style={{ fontSize: 14, color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
            Your previous brief is still right below — you can keep working with it. Email also gets you the saved version.
          </p>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && email.includes('@') && submit()}
            placeholder="your@email.com"
            autoFocus
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,.12)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 10, background: '#fff' }}
          />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {SOURCES.map(s => (
              <button
                key={s}
                onClick={() => setSource(s)}
                style={{ background: source === s ? '#1D1D1F' : 'rgba(255,255,255,.7)', color: source === s ? '#fff' : '#1D1D1F', border: '0.5px solid rgba(0,0,0,.1)', borderRadius: 7, padding: '5px 10px', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
              >
                {s}
              </button>
            ))}
          </div>

          {error && <p style={{ fontSize: 13, color: '#FF3B30', margin: '0 0 8px' }}>{error}</p>}

          <button
            onClick={submit}
            disabled={loading || !email.includes('@')}
            style={{ width: '100%', background: '#0066CC', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600, cursor: loading || !email.includes('@') ? 'not-allowed' : 'pointer', opacity: !email.includes('@') ? 0.5 : 1 }}
          >
            {loading ? 'Unlocking…' : 'Unlock 12 more →'}
          </button>

          <p style={{ fontSize: 11, color: '#AEAEB2', textAlign: 'center', margin: '8px 0 0' }}>
            No password. No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  )
}
