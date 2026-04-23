'use client'
import { useState } from 'react'

export default function TaglinesPage() {
  const [businessName, setBusinessName] = useState('')
  const [industry, setIndustry] = useState('')
  const [tone, setTone] = useState('professional')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ free: string[]; cacheKey: string; unlockUrl: string | null } | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    if (!businessName.trim() || !industry.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/taglines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, industry, tone }),
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

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '80px 24px 60px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        <a href="/" style={{ fontSize: 14, color: '#6E6E73', display: 'inline-block', marginBottom: 32 }}>← Back</a>

        <h1 style={{ fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', marginBottom: 8 }}>Tagline Generator</h1>
        <p style={{ fontSize: 17, color: '#6E6E73', marginBottom: 40 }}>Get 3 free taglines. Unlock all 10 for $29.</p>

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
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Industry</label>
            <input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. Restaurant, Salon, Plumbing"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Tone</label>
            <select
              value={tone}
              onChange={e => setTone(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, background: '#fff', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="professional">Professional</option>
              <option value="bold">Bold & Confident</option>
              <option value="friendly">Warm & Friendly</option>
              <option value="witty">Witty</option>
              <option value="premium">Premium / Luxury</option>
            </select>
          </div>
          <button
            onClick={generate}
            disabled={loading || !businessName.trim() || !industry.trim()}
            style={{ width: '100%', background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Generating...' : 'Generate taglines'}
          </button>
          {error && <p style={{ color: '#FF3B30', fontSize: 14, marginTop: 12 }}>{error}</p>}
        </div>

        {result && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#6E6E73', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '.5px' }}>Your 3 free taglines</p>
            {result.free.map((line, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: i < result.free.length - 1 ? '1px solid #F2F2F7' : 'none' }}>
                <p style={{ fontSize: 18, fontWeight: 500, color: '#1D1D1F', margin: 0 }}>{line}</p>
              </div>
            ))}

            <div style={{ marginTop: 24, padding: 20, background: '#F2F2F7', borderRadius: 12, textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', marginBottom: 4 }}>Unlock all 10 taglines</p>
              <p style={{ fontSize: 13, color: '#6E6E73', marginBottom: 16 }}>One-time payment. Download as text file.</p>
              {result.unlockUrl ? (
                <a
                  href={`${result.unlockUrl}?client_reference_id=${result.cacheKey}`}
                  style={{ display: 'inline-block', background: '#1D1D1F', color: '#fff', borderRadius: 10, padding: '11px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
                >
                  Unlock all 10 — $29
                </a>
              ) : (
                <p style={{ fontSize: 13, color: '#6E6E73' }}>Payment link coming soon</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
