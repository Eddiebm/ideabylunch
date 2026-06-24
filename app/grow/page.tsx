'use client'
export const runtime = 'edge'
import { useState, useRef } from 'react'
import EmailGate from '@/app/app/EmailGate'

type Field = {
  key: string
  label: string
  placeholder: string
  required?: boolean
  multiline?: boolean
  half?: boolean
}

type Tool = {
  id: string
  label: string
  emoji: string
  description: string
  fields: Field[]
}

const TOOLS: Tool[] = [
  {
    id: 'kit',
    label: '30-Day Kit',
    emoji: '📅',
    description: '30 social posts, email, Google ads, review templates, GBP tips.',
    fields: [
      { key: 'business', label: 'Business name & type', placeholder: "Mike's Plumbing", required: true, half: true },
      { key: 'location', label: 'Location', placeholder: 'St. Louis, MO', required: true, half: true },
      { key: 'services', label: 'Main services', placeholder: 'Emergency repairs, water heater installation, drain cleaning', required: true },
      { key: 'customer', label: 'Target customer', placeholder: 'St. Louis homeowners', half: true },
      { key: 'promo', label: 'Current promotion', placeholder: '$50 off first service call', half: true },
    ],
  },
  {
    id: 'review',
    label: 'Review Response',
    emoji: '⭐',
    description: 'Paste any Google or Yelp review — get a professional response in seconds.',
    fields: [
      { key: 'business', label: 'Business name', placeholder: "Mike's Plumbing", required: true, half: true },
      { key: 'businessType', label: 'Business type', placeholder: 'Plumbing service', half: true },
      { key: 'reviewText', label: 'Paste the review', placeholder: 'The technician was late and didn\'t fix the problem properly...', required: true, multiline: true },
      { key: 'stars', label: 'Star rating', placeholder: '1', half: true },
    ],
  },
  {
    id: 'proposal',
    label: 'Quote / Proposal',
    emoji: '📋',
    description: 'Describe the job — get a professional proposal your client can sign.',
    fields: [
      { key: 'business', label: 'Your business', placeholder: "Mike's Plumbing", required: true, half: true },
      { key: 'customerName', label: 'Customer name', placeholder: 'John & Sarah Thompson', required: true, half: true },
      { key: 'jobDescription', label: 'Job description', placeholder: 'Replace main water line from street to house, approx 60ft. Includes excavation, new 1" copper pipe, backfill.', required: true, multiline: true },
      { key: 'price', label: 'Total price ($)', placeholder: '3500', required: true, half: true },
      { key: 'timeline', label: 'Timeline', placeholder: '2 days, starting next Monday', half: true },
    ],
  },
  {
    id: 'reengage',
    label: 'Win Back Customers',
    emoji: '💌',
    description: 'Email + SMS to bring back customers who haven\'t booked in months.',
    fields: [
      { key: 'business', label: 'Business name', placeholder: "Mike's Plumbing", required: true, half: true },
      { key: 'location', label: 'Location', placeholder: 'St. Louis, MO', half: true },
      { key: 'services', label: 'Main services', placeholder: 'Plumbing repairs, water heaters, drain cleaning', required: true },
      { key: 'offer', label: 'Special offer to include', placeholder: '10% off for returning customers' },
    ],
  },
  {
    id: 'seasonal',
    label: 'Seasonal Campaign',
    emoji: '🎯',
    description: 'Full campaign — posts, email, SMS — for any upcoming season or occasion.',
    fields: [
      { key: 'business', label: 'Business name', placeholder: "Mike's Plumbing", required: true, half: true },
      { key: 'location', label: 'Location', placeholder: 'St. Louis, MO', required: true, half: true },
      { key: 'services', label: 'Services', placeholder: 'Emergency repairs, water heaters', required: true },
      { key: 'season', label: 'Season or occasion', placeholder: 'Winter — pipes freezing season', required: true, half: true },
      { key: 'offer', label: 'Promotional idea', placeholder: 'Free pipe inspection with any job', half: true },
    ],
  },
  {
    id: 'hiring',
    label: 'Hiring Post',
    emoji: '🙋',
    description: 'Job post for Instagram, LinkedIn, and Indeed — written to attract the right people.',
    fields: [
      { key: 'business', label: 'Business name', placeholder: "Mike's Plumbing", required: true, half: true },
      { key: 'location', label: 'Location', placeholder: 'St. Louis, MO', required: true, half: true },
      { key: 'role', label: 'Role / job title', placeholder: 'Licensed Plumber', required: true, half: true },
      { key: 'wage', label: 'Pay / wage', placeholder: '$28-35/hr based on experience', half: true },
      { key: 'requirements', label: 'Key requirements or notes', placeholder: '2+ years experience, own tools preferred, driver\'s license required', multiline: true },
    ],
  },
  {
    id: 'price-increase',
    label: 'Price Increase',
    emoji: '📈',
    description: 'Professional letter, SMS, and FAQ for announcing a rate increase.',
    fields: [
      { key: 'business', label: 'Business name', placeholder: "Mike's Plumbing", required: true, half: true },
      { key: 'effectiveDate', label: 'Effective date', placeholder: 'February 1, 2026', required: true, half: true },
      { key: 'oldPrice', label: 'Current rate / price', placeholder: '$125/hr or "starting at $199"', required: true, half: true },
      { key: 'newPrice', label: 'New rate / price', placeholder: '$145/hr or "starting at $229"', required: true, half: true },
      { key: 'reason', label: 'Reason (optional)', placeholder: 'Rising material costs, expanded team, new equipment' },
    ],
  },
]

export default function GrowPage() {
  const [activeTool, setActiveTool] = useState<Tool>(TOOLS[0])
  const [fields, setFields] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const setField = (key: string, value: string) => setFields(f => ({ ...f, [key]: value }))

  const requiredFields = activeTool.fields.filter(f => f.required).map(f => f.key)
  const canGenerate = requiredFields.every(k => (fields[k] || '').trim().length > 1)

  function switchTool(tool: Tool) {
    if (abortRef.current) abortRef.current.abort()
    setActiveTool(tool)
    setOutput('')
    setError('')
    setShowEmailGate(false)
  }

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
        body: JSON.stringify({ tool: activeTool.id, ...fields, email: activeEmail || undefined }),
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
      if (!reader) throw new Error('No stream')

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

  const busy = loading || streaming

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .tool-out h2 { font-size:18px;font-weight:700;color:#1D1D1F;letter-spacing:-.3px;margin:28px 0 10px }
        .tool-out h2:first-child{margin-top:0}
        .tool-out p{font-size:15px;color:#3C3C43;line-height:1.65;margin:0 0 10px}
        .tool-out strong{color:#1D1D1F}
        .tool-out hr{border:none;border-top:0.5px solid rgba(0,0,0,.1);margin:24px 0}
        .tab-pill{background:none;border:none;padding:8px 16px;border-radius:20px;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit}
        .tab-pill.active{background:#1D1D1F;color:#fff}
        .tab-pill:not(.active){color:#6E6E73}
        .tab-pill:not(.active):hover{background:rgba(0,0,0,.06)}
        input,textarea{font-family:-apple-system,BlinkMacSystemFont,sans-serif}
        .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:600px){.field-row{grid-template-columns:1fr}}
      `}</style>

      <nav style={{ background:'#fff',borderBottom:'0.5px solid rgba(0,0,0,.08)',padding:'0 24px',height:52,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100 }}>
        <a href="/" style={{ fontSize:17,fontWeight:600,color:'#1D1D1F',textDecoration:'none',letterSpacing:'-.3px' }}>IdeaByLunch</a>
        <a href="/app" style={{ fontSize:14,color:'#6E6E73',textDecoration:'none' }}>Launch a new business →</a>
      </nav>

      <div style={{ maxWidth:760,margin:'0 auto',padding:'40px 24px 96px' }}>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:12,fontWeight:700,color:'#30D158',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:10 }}>✦ For businesses that already exist</div>
          <h1 style={{ fontSize:34,fontWeight:700,color:'#1D1D1F',letterSpacing:'-1.2px',lineHeight:1.15,margin:'0 0 10px' }}>
            Grow your business.<br />One tool at a time.
          </h1>
          <p style={{ fontSize:16,color:'#6E6E73',margin:0,lineHeight:1.55 }}>
            AI-written content and documents for every part of running a small business — ready in under 2 minutes.
          </p>
        </div>

        {/* Tool tabs */}
        <div style={{ overflowX:'auto',marginBottom:24,paddingBottom:4 }}>
          <div style={{ display:'flex',gap:4,minWidth:'max-content' }}>
            {TOOLS.map(t => (
              <button
                key={t.id}
                className={`tab-pill${activeTool.id === t.id ? ' active' : ''}`}
                onClick={() => switchTool(t)}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div style={{ background:'#fff',borderRadius:20,padding:28,boxShadow:'0 1px 3px rgba(0,0,0,.06),0 0 0 0.5px rgba(0,0,0,.06)',marginBottom:20 }}>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:17,fontWeight:600,color:'#1D1D1F',letterSpacing:'-.3px',marginBottom:4 }}>{activeTool.emoji} {activeTool.label}</div>
            <div style={{ fontSize:14,color:'#6E6E73' }}>{activeTool.description}</div>
          </div>

          {/* Fields — group half-width fields into rows */}
          {(() => {
            const rows: Field[][] = []
            let i = 0
            while (i < activeTool.fields.length) {
              const f = activeTool.fields[i]
              if (f.half && activeTool.fields[i + 1]?.half) {
                rows.push([f, activeTool.fields[i + 1]])
                i += 2
              } else {
                rows.push([f])
                i++
              }
            }
            return rows.map((row, ri) => (
              <div key={ri} className={row.length === 2 ? 'field-row' : ''} style={{ marginBottom:14 }}>
                {row.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize:13,fontWeight:600,color:'#1D1D1F',display:'block',marginBottom:5 }}>
                      {f.label}{f.required && <span style={{ color:'#FF3B30',marginLeft:2 }}>*</span>}
                    </label>
                    {f.multiline ? (
                      <textarea
                        value={fields[f.key] || ''}
                        onChange={e => setField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                        style={{ width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #D2D2D7',fontSize:15,outline:'none',resize:'vertical' }}
                      />
                    ) : (
                      <input
                        value={fields[f.key] || ''}
                        onChange={e => setField(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={{ width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid #D2D2D7',fontSize:15,outline:'none' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))
          })()}

          {error && <p style={{ fontSize:14,color:'#FF3B30',margin:'4px 0 12px' }}>{error}</p>}

          <button
            onClick={() => generate()}
            disabled={busy || !canGenerate}
            style={{ width:'100%',marginTop:8,background:canGenerate && !busy ? '#1D1D1F' : '#D2D2D7',color:'#fff',border:'none',borderRadius:12,padding:'14px',fontSize:16,fontWeight:600,cursor:canGenerate && !busy ? 'pointer' : 'not-allowed',letterSpacing:'-.1px',transition:'background .2s' }}
          >
            {loading ? 'Generating…' : streaming ? 'Writing…' : `Generate ${activeTool.label} →`}
          </button>

          {busy && (
            <p style={{ fontSize:13,color:'#AEAEB2',textAlign:'center',margin:'10px 0 0',animation:'pulse 1.5s ease-in-out infinite' }}>
              {loading ? 'Starting…' : 'Writing your content…'}
            </p>
          )}
        </div>

        {/* Email gate */}
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

        {/* Output */}
        {output && (
          <div style={{ animation:'fadeUp .4s ease both' }}>
            <div style={{ background:'#fff',borderRadius:20,padding:28,boxShadow:'0 1px 3px rgba(0,0,0,.06),0 0 0 0.5px rgba(0,0,0,.06)',marginBottom:16 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
                <div style={{ fontSize:15,fontWeight:600,color:'#1D1D1F' }}>{activeTool.emoji} {fields.business || activeTool.label}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(output)}
                  style={{ background:'#F2F2F7',border:'none',borderRadius:8,padding:'7px 14px',fontSize:13,fontWeight:600,color:'#1D1D1F',cursor:'pointer' }}
                >
                  Copy all
                </button>
              </div>
              <div className="tool-out" style={{ fontSize:15,color:'#3C3C43',lineHeight:1.7,whiteSpace:'pre-wrap',wordBreak:'break-word' }}>
                {output}
              </div>
            </div>

            {!showEmailGate && (
              <div style={{ background:'linear-gradient(135deg,#1D1D1F 0%,#3C3C43 100%)',borderRadius:20,padding:'24px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:20,flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:12,fontWeight:700,color:'#30D158',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:4 }}>All 7 tools, every month</div>
                  <div style={{ fontSize:19,fontWeight:700,color:'#fff',letterSpacing:'-.4px',marginBottom:2 }}>$49/month</div>
                  <div style={{ fontSize:13,color:'rgba(255,255,255,.55)' }}>Unlimited generations. Cancel anytime.</div>
                </div>
                <a href="/app" style={{ background:'#fff',color:'#1D1D1F',borderRadius:12,padding:'11px 22px',fontSize:15,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap',flexShrink:0 }}>
                  Get unlimited →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
