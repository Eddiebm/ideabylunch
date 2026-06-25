'use client'
export const runtime = 'edge'
import { useState } from 'react'

type ReferData = {
  code: string
  link: string
  conversions: number
  earnings: number
  payoutEligible: boolean
  payoutRequested: boolean
}

export default function ReferPage() {
  const [email, setEmail] = useState('')
  const [data, setData] = useState<ReferData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState('')

  async function lookup() {
    if (!email.includes('@')) return
    setLoading(true)
    const res = await fetch(`/api/refer?email=${encodeURIComponent(email)}`)
    const d = await res.json()
    if (!d.error) setData(d)
    setLoading(false)
  }

  function copy() {
    if (!data) return
    navigator.clipboard.writeText(data.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function requestPayout() {
    if (!data || payoutLoading) return
    setPayoutLoading(true)
    setPayoutMsg('')
    try {
      const res = await fetch('/api/refer', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await res.json()
      if (d.ok) {
        setPayoutMsg(`Payout of $${d.earnings.toFixed(2)} requested. We'll send it within 48 hours.`)
        setData({ ...data, payoutEligible: false, payoutRequested: true })
      } else {
        setPayoutMsg(d.error || 'Something went wrong.')
      }
    } finally {
      setPayoutLoading(false)
    }
  }

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <nav style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F', textDecoration: 'none', letterSpacing: '-.3px' }}>IdeaByLunch</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/grow" style={{ fontSize: 14, color: '#30D158', fontWeight: 600, textDecoration: 'none' }}>Grow</a>
          <a href="/refer" style={{ fontSize: 14, color: '#0066CC', fontWeight: 600, textDecoration: 'none' }}>Refer & earn</a>
          <a href="/app" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Launch →</a>
        </div>
      </nav>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '60px 24px 80px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>💸</div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', margin: '0 0 10px' }}>Earn 30% per referral</h1>
          <p style={{ fontSize: 16, color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>
            Share your link. When someone launches a site or joins Grow, you earn 30% cash. No cap, no expiry.
          </p>
        </div>

        {/* Email lookup */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '0.5px solid rgba(0,0,0,.08)', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: 10 }}>Your email</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="you@example.com"
              style={{ flex: 1, padding: '11px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', color: '#1D1D1F' }}
            />
            <button
              onClick={lookup}
              disabled={!email.includes('@') || loading}
              style={{ background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: email.includes('@') && !loading ? 1 : 0.4, whiteSpace: 'nowrap' }}
            >
              {loading ? '...' : 'Get my link'}
            </button>
          </div>
        </div>

        {/* Dashboard */}
        {data && (
          <>
            {/* Link */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '0.5px solid rgba(0,0,0,.08)', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 10px' }}>Your referral link</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, background: '#F2F2F7', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#1D1D1F', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {data.link}
                </div>
                <button
                  onClick={copy}
                  style={{ background: copied ? '#30D158' : '#0066CC', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .2s' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, textAlign: 'center', border: '0.5px solid rgba(0,0,0,.08)' }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px' }}>{data.conversions}</div>
                <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 4 }}>Paid referrals</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, textAlign: 'center', border: '0.5px solid rgba(0,0,0,.08)' }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: data.earnings > 0 ? '#30D158' : '#1D1D1F', letterSpacing: '-.5px' }}>${data.earnings.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 4 }}>Total earned</div>
              </div>
            </div>

            {/* Payout section */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '0.5px solid rgba(0,0,0,.08)', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
              {payoutMsg ? (
                <p style={{ fontSize: 14, color: data.payoutRequested ? '#30D158' : '#FF3B30', margin: 0, textAlign: 'center', fontWeight: 500 }}>{payoutMsg}</p>
              ) : data.payoutRequested ? (
                <p style={{ fontSize: 14, color: '#6E6E73', margin: 0, textAlign: 'center' }}>✓ Payout requested — we'll send it within 48 hours.</p>
              ) : data.payoutEligible ? (
                <button
                  onClick={requestPayout}
                  disabled={payoutLoading}
                  style={{ width: '100%', background: '#30D158', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, cursor: payoutLoading ? 'default' : 'pointer', opacity: payoutLoading ? 0.7 : 1 }}
                >
                  {payoutLoading ? 'Requesting…' : `Request payout — $${data.earnings.toFixed(2)}`}
                </button>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6E6E73', marginBottom: 8 }}>
                    <span>Progress to payout</span>
                    <span>${data.earnings.toFixed(2)} / $50</span>
                  </div>
                  <div style={{ background: '#F2F2F7', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#30D158', height: '100%', width: `${Math.min(100, (data.earnings / 50) * 100)}%`, transition: 'width .5s' }} />
                  </div>
                  {data.earnings === 0 && (
                    <p style={{ fontSize: 12, color: '#AEAEB2', margin: '10px 0 0', textAlign: 'center' }}>Share your link to start earning</p>
                  )}
                </>
              )}
            </div>

            {/* Share prompt */}
            <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '0.5px solid rgba(0,0,0,.08)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 10px' }}>Ready to paste</p>
              <p style={{ fontSize: 13, color: '#1D1D1F', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                "Went from idea to live website in one morning using IdeaByLunch. If you're starting a business, try it: {data.link}"
              </p>
            </div>
          </>
        )}

        {/* How it works — shown before lookup */}
        {!data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 8 }}>
            {[
              { step: '1', title: 'Get your link', body: 'Enter your email above — same link every time.' },
              { step: '2', title: 'Share it', body: 'Post on TikTok, LinkedIn, your bio, anywhere.' },
              { step: '3', title: 'Get paid', body: 'Hit $50 and request your payout in cash.' },
            ].map(({ step, title, body }) => (
              <div key={step} style={{ background: '#fff', borderRadius: 14, padding: 16, border: '0.5px solid rgba(0,0,0,.08)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0066CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{step}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', marginBottom: 4 }}>{title}</div>
                <p style={{ fontSize: 12, color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>{body}</p>
              </div>
            ))}
          </div>
        )}

        {/* Commission table */}
        {!data && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '0.5px solid rgba(0,0,0,.08)', marginTop: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.6px', margin: '0 0 14px' }}>What you earn</p>
            {[
              { product: 'Website — US', price: '$149', earn: '$44.70' },
              { product: 'Website — Ghana / NG', price: '$49', earn: '$14.70' },
              { product: 'Grow subscription', price: '$49/mo', earn: '$14.70/mo' },
            ].map(r => (
              <div key={r.product} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F' }}>{r.product}</div>
                  <div style={{ fontSize: 12, color: '#6E6E73' }}>{r.price}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#30D158' }}>{r.earn}</div>
              </div>
            ))}
            <p style={{ fontSize: 12, color: '#AEAEB2', margin: '12px 0 0' }}>30% of every payment. Recurring monthly on Grow. No cap.</p>
          </div>
        )}
      </div>
    </>
  )
}
