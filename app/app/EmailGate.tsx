'use client'
import { useState, useEffect } from 'react'

interface Props {
  onUnlock: (email: string) => void
}

export default function EmailGate({ onUnlock }: Props) {
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Capture UTM source or referrer on mount
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
      // Fire-and-forget lead capture with source
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(20px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, maxWidth: 420, width: '100%', padding: '36px 32px', boxShadow: '0 32px 80px rgba(0,0,0,.2)', animation: 'fadeUp .3s ease both' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 8px' }}>
            Save your brief + unlock 5 more
          </h2>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: 0, lineHeight: 1.6 }}>
            Drop your email and we'll send you the brief, plus unlock 5 more free generates.
          </p>
        </div>

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && email.includes('@') && submit()}
          placeholder="your@email.com"
          autoFocus
          style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
        />

        {/* Source question */}
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', margin: '0 0 8px' }}>How did you find us?</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {SOURCES.map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              style={{ background: source === s ? '#1D1D1F' : '#F2F2F7', color: source === s ? '#fff' : '#1D1D1F', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p style={{ fontSize: 13, color: '#FF3B30', margin: '0 0 10px' }}>{error}</p>}

        <button
          onClick={submit}
          disabled={loading || !email.includes('@')}
          style={{ width: '100%', background: '#0066CC', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 600, cursor: loading || !email.includes('@') ? 'not-allowed' : 'pointer', opacity: !email.includes('@') ? 0.5 : 1 }}
        >
          {loading ? 'Unlocking…' : 'Unlock 5 more briefs →'}
        </button>

        <p style={{ fontSize: 12, color: '#AEAEB2', textAlign: 'center', margin: '12px 0 0' }}>
          No password. No spam. Unsubscribe anytime.
        </p>
      </div>
    </div>
  )
}
