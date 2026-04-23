'use client'
import { useState } from 'react'

type Tier = 'starter' | 'pro'

export default function LogoPage() {
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [tier, setTier] = useState<Tier>('starter')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ urls: string[]; cacheKey: string } | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    if (!businessName.trim() || !industry.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, industry, tier }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const price = tier === 'pro' ? '$199' : '$99'
  const priceEnvKey = tier === 'pro' ? 'STRIPE_LOGO_PRO_PAYMENT_LINK' : 'STRIPE_LOGO_STARTER_PAYMENT_LINK'

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '80px 24px 60px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <a href="/" style={{ fontSize: 14, color: '#6E6E73', display: 'inline-block', marginBottom: 32 }}>← Back</a>

        <h1 style={{ fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', marginBottom: 8 }}>Logo Generator</h1>
        <p style={{ fontSize: 17, color: '#6E6E73', marginBottom: 40 }}>3 AI-generated logo concepts. Preview free, download after payment.</p>

        {/* Tier picker */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {(['starter', 'pro'] as Tier[]).map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 12, border: `2px solid ${tier === t ? '#1D1D1F' : '#D2D2D7'}`,
                background: tier === t ? '#1D1D1F' : '#fff', color: tier === t ? '#fff' : '#1D1D1F',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t === 'starter' ? 'Starter — $99' : 'Pro Vector — $199'}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Business name</label>
            <input
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Kwame's Kitchen"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Industry</label>
            <input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Restaurant, Salon, Plumbing"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {tier === 'starter' && (
            <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#6E6E73' }}>
              3 PNG logos • Transparent background • High resolution
            </div>
          )}
          {tier === 'pro' && (
            <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#6E6E73' }}>
              3 SVG vector logos • Scalable to any size • Favicon included • Social media variants
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading || !businessName.trim() || !industry.trim()}
            style={{ width: '100%', background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Generating logos (30–60s)...' : 'Generate 3 logo concepts'}
          </button>
          {error && <p style={{ color: '#FF3B30', fontSize: 14, marginTop: 12 }}>{error}</p>}
        </div>

        {result && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#6E6E73', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '.5px' }}>Your 3 concepts</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              {result.urls.map((url, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #F2F2F7', aspectRatio: '1', background: '#FAFAFA' }}>
                  <img src={url} alt={`Logo concept ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                </div>
              ))}
            </div>
            <div style={{ padding: 20, background: '#F2F2F7', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', marginBottom: 4 }}>Download your logos</p>
              <p style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16 }}>
                {tier === 'pro' ? 'SVG + PNG + favicon + social variants' : 'High-res PNG files, transparent background'}
              </p>
              <a
                href={`/api/logo/checkout?key=${result.cacheKey}&tier=${tier}`}
                style={{ display: 'inline-block', background: '#1D1D1F', color: '#fff', borderRadius: 10, padding: '11px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
              >
                Download — {price}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
