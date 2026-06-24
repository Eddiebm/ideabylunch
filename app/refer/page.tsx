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
  const [copied, setCopied] = useState(false)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutMsg, setPayoutMsg] = useState('')

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
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>IdeaByLunch</a>
      </nav>

      <div style={{ maxWidth: 520, margin: '64px auto', padding: '0 24px' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: 36, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 8px' }}>Refer a business, earn 30%</h1>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: '0 0 28px' }}>
            Every business you refer earns you 30% of the sale — paid in cash. No cap. Enter your email to get your link.
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: data.payoutEligible || data.payoutRequested || payoutMsg ? 16 : 0 }}>
                <div style={{ background: '#fff', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', margin: '0 0 4px' }}>{data.conversions}</p>
                  <p style={{ fontSize: 12, color: '#6E6E73', margin: 0 }}>Referrals</p>
                </div>
                <div style={{ background: '#fff', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#30D158', margin: '0 0 4px' }}>${data.earnings.toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: '#6E6E73', margin: 0 }}>Earned (30%)</p>
                </div>
              </div>

              {payoutMsg && (
                <p style={{ fontSize: 13, color: data.payoutRequested ? '#30D158' : '#FF3B30', margin: '0 0 12px', textAlign: 'center' }}>{payoutMsg}</p>
              )}

              {data.payoutEligible && !payoutMsg && (
                <button
                  onClick={requestPayout}
                  disabled={payoutLoading}
                  style={{ width: '100%', background: '#30D158', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600, cursor: payoutLoading ? 'not-allowed' : 'pointer', opacity: payoutLoading ? 0.7 : 1 }}
                >
                  {payoutLoading ? 'Requesting…' : `Request payout — $${data.earnings.toFixed(2)}`}
                </button>
              )}

              {data.payoutRequested && !payoutMsg && (
                <p style={{ fontSize: 13, color: '#6E6E73', textAlign: 'center', margin: 0 }}>Payout requested — we'll send it within 48 hours.</p>
              )}

              {!data.payoutEligible && !data.payoutRequested && data.earnings > 0 && (
                <p style={{ fontSize: 12, color: '#AEAEB2', textAlign: 'center', margin: 0 }}>
                  ${(50 - data.earnings).toFixed(2)} more to reach the $50 payout minimum.
                </p>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {[
            { step: '1', text: 'Share your link — post it on TikTok, send to a friend, put it in your bio' },
            { step: '2', text: 'They buy a website — you get 30% of the sale, automatically tracked' },
            { step: '3', text: 'Hit $50 and request your payout — paid via PayPal or Wise within 48 hours' },
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
