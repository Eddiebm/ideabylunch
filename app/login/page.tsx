'use client'
export const runtime = 'edge'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'That link has expired. Request a new one below.',
  missing_token: 'Invalid link. Request a new one below.',
  service_unavailable: 'Service temporarily unavailable. Try again shortly.',
}

function LoginForm() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error') || ''
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(ERROR_MESSAGES[errorCode] || '')

  async function sendLink() {
    if (!email.includes('@')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>idea2Lunch</a>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
          {sent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ width: 48, height: 48, background: '#F2F2F7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span style={{ fontSize: 24 }}>📬</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>Check your email</h2>
                <p style={{ fontSize: 15, color: '#6E6E73', margin: 0 }}>
                  We sent a login link to <strong>{email}</strong>. It expires in 15 minutes.
                </p>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>Access your dashboard</h2>
              <p style={{ fontSize: 15, color: '#6E6E73', margin: '0 0 24px' }}>Enter the email you used to purchase your site.</p>
              {error && (
                <div style={{ background: '#FFF2F2', border: '1px solid #FFCDD2', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, color: '#C62828', margin: 0 }}>{error}</p>
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendLink()}
                placeholder="your@email.com"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
              />
              <button
                onClick={sendLink}
                disabled={loading || !email.includes('@')}
                style={{ width: '100%', background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Sending...' : 'Send login link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
