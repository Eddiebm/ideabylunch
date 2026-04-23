'use client'
import { useState, useEffect } from 'react'

export default function ReferPage() {
  const [email, setEmail] = useState('')
  const [data, setData] = useState<{ code: string; link: string; conversions: number; credit: number } | null>(null)
  const [copied, setCopied] = useState(false)

  async function lookup() {
    if (!email.includes('@')) return
    const res = await fetch(`/api/refer?email=${encodeURIComponent(email)}`)
    const d = await res.json()
    if (!d.error) setData(d)
  }

  function copy() {
    if (!data) return
    navigator.clipboard.writeText(data.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>idea2Lunch</a>
      </nav>

      <div style={{ maxWidth: 520, margin: '64px auto', padding: '0 24px' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 8px' }}>Refer a business, earn $20</h1>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: '0 0 28px' }}>
            Every friend you refer who buys a site earns you $20 account credit. Enter your email to get your referral link.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="your@email.com"
              style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none' }}
            />
            <button
              onClick={lookup}
              disabled={!email.includes('@')}
              style={{ background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: email.includes('@') ? 1 : 0.4 }}
            >
              Get link
            </button>
          </div>

          {data && (
            <div style={{ background: '#F2F2F7', borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.5px', margin: '0 0 10px' }}>Your referral link</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#1D1D1F', wordBreak: 'break-all', border: '1px solid rgba(0,0,0,.08)' }}>
                  {data.link}
                </div>
                <button
                  onClick={copy}
                  style={{ background: copied ? '#30D158' : '#1D1D1F', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .2s' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: '0 0 4px' }}>{data.conversions}</p>
                  <p style={{ fontSize: 12, color: '#6E6E73', margin: 0 }}>Referrals</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#30D158', margin: '0 0 4px' }}>${data.credit}</p>
                  <p style={{ fontSize: 12, color: '#6E6E73', margin: 0 }}>Credit earned</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { step: '1', text: 'Share your link with any local business owner' },
            { step: '2', text: 'They buy a site — we notify you' },
            { step: '3', text: 'You get $20 credit toward your next product' },
          ].map(({ step, text }) => (
            <div key={step} style={{ background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0066CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{step}</div>
              <p style={{ fontSize: 13, color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
