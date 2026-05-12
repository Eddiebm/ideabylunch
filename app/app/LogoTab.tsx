'use client'
import { useState } from 'react'

type Tier = 'starter' | 'pro'

interface Props {
  productName: string
  vision: string
}

function deriveIndustry(vision: string): string {
  if (!vision) return ''
  // Take first sentence, strip the product name preamble, cap at 50 chars
  const first = vision.split(/[.!?]/)[0] || ''
  const cleaned = first.replace(/^[\w\s&'-]+ is (a |an )?/i, '').trim()
  return cleaned.slice(0, 50)
}

export default function LogoTab({ productName, vision }: Props) {
  const [businessName, setBusinessName] = useState(productName)
  const [industry, setIndustry] = useState(() => deriveIndustry(vision))
  const [tier, setTier] = useState<Tier>('starter')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ urls: string[]; cacheKey: string } | null>(null)
  const [error, setError] = useState('')

  async function generate() {
    if (!businessName.trim() || !industry.trim()) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName: businessName.trim(), industry: industry.trim(), tier }),
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

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', marginTop: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73' }}>9</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.1px' }}>Logo</span>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F2F2F7', borderRadius: 100, padding: '2px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0066CC', animation: 'pulse .8s ease infinite' }} />
              <span style={{ fontSize: 11, color: '#6E6E73', fontWeight: 500 }}>Generating</span>
            </div>
          )}
          {result && !loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(48,209,88,.1)', borderRadius: 100, padding: '2px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#30D158' }} />
              <span style={{ fontSize: 11, color: '#30D158', fontWeight: 500 }}>Ready</span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#AEAEB2' }}>3 AI concepts, preview free</span>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {/* Tier picker */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['starter', 'pro'] as Tier[]).map(t => (
            <button
              key={t}
              onClick={() => setTier(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: `1.5px solid ${tier === t ? '#1D1D1F' : '#D2D2D7'}`,
                background: tier === t ? '#1D1D1F' : '#fff',
                color: tier === t ? '#fff' : '#1D1D1F',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {t === 'starter' ? 'Starter — $99' : 'Pro Vector — $199'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#6E6E73', display: 'block', marginBottom: 5 }}>Business name</label>
            <input
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#6E6E73', display: 'block', marginBottom: 5 }}>Industry</label>
            <input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. coffee subscription"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D2D2D7', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>
        </div>

        <div style={{ background: '#F2F2F7', borderRadius: 8, padding: '9px 14px', marginBottom: 16, fontSize: 12, color: '#6E6E73' }}>
          {tier === 'starter'
            ? '3 PNG concepts · Transparent background · High resolution'
            : '3 SVG vectors · Scalable to any size · Favicon + social variants'}
        </div>

        <button
          onClick={generate}
          disabled={loading || !businessName.trim() || !industry.trim()}
          style={{ background: loading ? 'rgba(0,0,0,.05)' : '#1D1D1F', color: loading ? '#AEAEB2' : '#fff', border: 'none', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s' }}
        >
          {loading
            ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(0,0,0,.15)', borderTopColor: '#AEAEB2', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Generating (30–60s)…</>
            : result ? 'Regenerate' : 'Generate 3 logo concepts'}
        </button>
        {error && <p style={{ color: '#FF3B30', fontSize: 13, marginTop: 10 }}>{error}</p>}

        {/* Results */}
        {result && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {result.urls.map((url, i) => (
                <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #F2F2F7', aspectRatio: '1', background: '#FAFAFA' }}>
                  <img src={url} alt={`Logo concept ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                </div>
              ))}
            </div>
            <div style={{ background: '#F2F2F7', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>Download your logos</div>
                <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2 }}>
                  {tier === 'pro' ? 'SVG + PNG + favicon + social variants' : 'High-res PNG, transparent background'}
                </div>
              </div>
              <a
                href={`/api/logo/checkout?key=${result.cacheKey}&tier=${tier}`}
                style={{ display: 'inline-block', background: '#1D1D1F', color: '#fff', borderRadius: 10, padding: '10px 22px', fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' as const }}
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
