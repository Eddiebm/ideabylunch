'use client'
export const runtime = 'edge'
import { useState, useRef } from 'react'
import EmailGate from '@/app/app/EmailGate'

export default function GrowPage() {
  const [business, setBusiness] = useState('')
  const [location, setLocation] = useState('')
  const [services, setServices] = useState('')
  const [customer, setCustomer] = useState('')
  const [promo, setPromo] = useState('')
  const [email, setEmail] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const canGenerate = business.trim().length > 2 && location.trim().length > 2 && services.trim().length > 5

  async function generate(overrideEmail?: string) {
    const activeEmail = overrideEmail || email
    setLoading(true)
    setStreaming(false)
    setError('')
    setOutput('')
    let gateAfterStream = false

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/grow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
        body: JSON.stringify({ business, location, services, customer, promo, email: activeEmail || undefined }),
      })

      if (res.status === 429) {
        setLoading(false)
        setShowEmailGate(true)
        return
      }

      gateAfterStream = res.headers.get('X-Free-Remaining') === '0'
      setLoading(false)
      setStreaming(true)

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response stream')

      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            const parsed = JSON.parse(payload)
            if (parsed.delta?.text) setOutput(prev => prev + parsed.delta.text)
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
      setStreaming(false)
      if (gateAfterStream) setShowEmailGate(true)
    }
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .kit-output h2 { font-size: 18px; font-weight: 700; color: #1D1D1F; letter-spacing: -.3px; margin: 28px 0 10px; }
        .kit-output h2:first-child { margin-top: 0; }
        .kit-output p { font-size: 15px; color: #3C3C43; line-height: 1.65; margin: 0 0 10px; }
        .kit-output strong { color: #1D1D1F; }
        .kit-output hr { border: none; border-top: 0.5px solid rgba(0,0,0,.1); margin: 24px 0; }
      `}</style>

      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none', letterSpacing: '-.3px' }}>IdeaByLunch</a>
        <a href="/app" style={{ fontSize: 14, color: '#6E6E73', textDecoration: 'none' }}>Launch a new business →</a>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 96px' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#30D158', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>
            ✦ For businesses that already have a website
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.2px', lineHeight: 1.15, margin: '0 0 12px' }}>
            Your 30-day marketing kit.<br />Ready in 2 minutes.
          </h1>
          <p style={{ fontSize: 17, color: '#6E6E73', margin: 0, lineHeight: 1.55 }}>
            30 social posts, a customer email, Google ad copy, review templates, and GBP tips — written for your specific business. Just describe what you do.
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 0.5px rgba(0,0,0,.06)', marginBottom: 24 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Business name & type</label>
                <input
                  value={business}
                  onChange={e => setBusiness(e.target.value)}
                  placeholder="Mike's Plumbing"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Location</label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="St. Louis, MO"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Main services</label>
              <input
                value={services}
                onChange={e => setServices(e.target.value)}
                placeholder="Emergency repairs, water heater installation, drain cleaning"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Target customer <span style={{ color: '#AEAEB2', fontWeight: 400 }}>(optional)</span></label>
                <input
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  placeholder="St. Louis homeowners"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', display: 'block', marginBottom: 6 }}>Current promotion <span style={{ color: '#AEAEB2', fontWeight: 400 }}>(optional)</span></label>
                <input
                  value={promo}
                  onChange={e => setPromo(e.target.value)}
                  placeholder="$50 off first service call"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          </div>

          {error && <p style={{ fontSize: 14, color: '#FF3B30', margin: '12px 0 0' }}>{error}</p>}

          <button
            onClick={() => generate()}
            disabled={loading || streaming || !canGenerate}
            style={{
              width: '100%',
              marginTop: 20,
              background: canGenerate && !loading && !streaming ? '#1D1D1F' : '#D2D2D7',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px',
              fontSize: 16,
              fontWeight: 600,
              cursor: canGenerate && !loading && !streaming ? 'pointer' : 'not-allowed',
              letterSpacing: '-.1px',
              transition: 'background .2s',
            }}
          >
            {loading ? 'Generating…' : streaming ? 'Writing your kit…' : 'Generate my 30-day marketing kit →'}
          </button>

          {(loading || streaming) && (
            <p style={{ fontSize: 13, color: '#AEAEB2', textAlign: 'center', margin: '10px 0 0', animation: 'pulse 1.5s ease-in-out infinite' }}>
              {loading ? 'Starting up…' : 'Writing 30 posts, email, ads, and more…'}
            </p>
          )}
        </div>

        {showEmailGate && (
          <EmailGate
            hasBrief={!!output}
            onUnlock={e => {
              setEmail(e)
              setShowEmailGate(false)
              if (!output) generate(e)
            }}
            onDismiss={() => setShowEmailGate(false)}
          />
        )}

        {output && (
          <div style={{ animation: 'fadeUp .4s ease both' }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 0.5px rgba(0,0,0,.06)', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#30D158', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Your marketing kit</div>
                  <div style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px' }}>{business} · {location}</div>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(output)}
                  style={{ background: '#F2F2F7', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#1D1D1F', cursor: 'pointer' }}
                >
                  Copy all
                </button>
              </div>
              <div
                className="kit-output"
                style={{ fontSize: 15, color: '#3C3C43', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              >
                {output}
              </div>
            </div>

            {!showEmailGate && (
              <div style={{ background: 'linear-gradient(135deg, #1D1D1F 0%, #3C3C43 100%)', borderRadius: 20, padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#30D158', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Get a fresh kit every month</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-.4px', marginBottom: 4 }}>$49/month — cancel anytime</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,.6)' }}>New kit drops the 1st of each month. No contract.</div>
                </div>
                <a
                  href="/app"
                  style={{ background: '#fff', color: '#1D1D1F', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  Get monthly kits →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
