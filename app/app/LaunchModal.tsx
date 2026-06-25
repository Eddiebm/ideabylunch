'use client'
import { useState } from 'react'

const PLANS = [
  { id: 'launch', name: 'Launch', price: '$299', desc: 'Built and deployed in 4 hours.', features: ['Complete product brief', 'Full codebase', 'Deployed to Vercel', 'GitHub repo'] },
  { id: 'design', name: 'Launch + Design', price: '$699', desc: 'Built, designed, and polished.', features: ['Everything in Launch', 'Custom design system', 'Branded landing page', 'Figma file'], featured: true },
  { id: 'full', name: 'Full Product', price: '$1,499', desc: 'Complete SaaS, ready to charge.', features: ['Everything in Launch + Design', 'Auth (Clerk)', 'Stripe payments', 'Database (Supabase)'] },
]

export default function LaunchModal({ idea, brief, onClose }: { idea: string; brief: string; onClose: () => void }) {
  const [step, setStep] = useState<'plans' | 'form' | 'done'>('plans')
  const [plan, setPlan] = useState(PLANS[1])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, idea, brief, plan: plan.name }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setStep('done')
    } catch (e: any) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#111829', border: '1px solid rgba(168,192,255,.12)', borderRadius: 10, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(168,192,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#c8ff00', marginBottom: 4 }}>⚡ Launch this idea</div>
            <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, color: '#e8ecf8' }}>Choose your plan</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid rgba(168,192,255,.08)', borderRadius: 4, width: 32, height: 32, color: '#4a6080', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>

        <div style={{ padding: 28 }}>
          {step === 'plans' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {PLANS.map(p => (
                  <div key={p.id} onClick={() => setPlan(p)}
                    style={{ background: plan.id === p.id ? 'rgba(200,255,0,.06)' : '#1a2236', border: `1px solid ${plan.id === p.id ? 'rgba(200,255,0,.3)' : 'rgba(168,192,255,.08)'}`, borderRadius: 6, padding: '18px 20px', cursor: 'pointer', transition: 'all .15s', position: 'relative' }}>
                    {p.featured && <div style={{ position: 'absolute', top: -1, right: 20, background: '#c8ff00', color: '#0a0e1a', fontFamily: 'DM Mono,monospace', fontSize: 8, fontWeight: 500, letterSpacing: '.12em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '0 0 4px 4px' }}>Most popular</div>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12, color: plan.id === p.id ? '#c8ff00' : '#8fa8cc' }}>{p.name}</div>
                      <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 26, color: '#e8ecf8' }}>{p.price}</div>
                    </div>
                    <div style={{ fontFamily: 'Crimson Pro,serif', fontSize: 15, color: '#8fa8cc', marginBottom: 10 }}>{p.desc}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {p.features.map(f => <span key={f} style={{ fontFamily: 'DM Mono,monospace', fontSize: 9, color: plan.id === p.id ? '#c8ff00' : '#4a6080', background: plan.id === p.id ? 'rgba(200,255,0,.08)' : 'rgba(168,192,255,.04)', padding: '2px 8px', borderRadius: 2 }}>✦ {f}</span>)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'rgba(168,192,255,.04)', borderRadius: 6, padding: '12px 16px', marginBottom: 20, fontFamily: 'DM Mono,monospace', fontSize: 10, color: '#4a6080', lineHeight: 1.7 }}>
                + $99/month managed hosting · or $199 full ownership transfer
              </div>
              <button onClick={() => setStep('form')}
                style={{ width: '100%', background: '#c8ff00', color: '#0a0e1a', border: 'none', borderRadius: 5, padding: '16px', fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Continue with {plan.name} — {plan.price} →
              </button>
            </>
          )}

          {step === 'form' && (
            <>
              <button onClick={() => setStep('plans')} style={{ background: 'none', border: 'none', color: '#4a6080', fontFamily: 'DM Mono,monospace', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 20, padding: 0 }}>← Back to plans</button>
              <div style={{ background: 'rgba(200,255,0,.04)', border: '1px solid rgba(200,255,0,.15)', borderRadius: 5, padding: '12px 16px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, color: '#c8ff00' }}>{plan.name}</span>
                <span style={{ fontFamily: 'Playfair Display,serif', fontSize: 22, color: '#e8ecf8' }}>{plan.price}</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4a6080', display: 'block', marginBottom: 8 }}>Your name</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Eddie Bannerman"
                  style={{ width: '100%', background: '#1a2236', border: '1px solid rgba(168,192,255,.08)', borderRadius: 4, padding: '14px 16px', fontFamily: 'Crimson Pro,serif', fontSize: 17, color: '#e8ecf8', outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4a6080', display: 'block', marginBottom: 8 }}>Your email</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" type="email"
                  style={{ width: '100%', background: '#1a2236', border: '1px solid rgba(168,192,255,.08)', borderRadius: 4, padding: '14px 16px', fontFamily: 'Crimson Pro,serif', fontSize: 17, color: '#e8ecf8', outline: 'none' }} />
              </div>
              {error && <div style={{ color: '#f87171', fontFamily: 'DM Mono,monospace', fontSize: 11, marginBottom: 16 }}>⚠ {error}</div>}
              <button onClick={handleSubmit} disabled={loading || !name.trim() || !email.trim()}
                style={{ width: '100%', background: loading || !name.trim() || !email.trim() ? '#1a2236' : '#c8ff00', color: loading || !name.trim() || !email.trim() ? '#4a6080' : '#0a0e1a', border: 'none', borderRadius: 5, padding: '16px', fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', cursor: loading || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer', transition: 'all .15s' }}>
                {loading ? 'Sending request…' : `Request ${plan.name} — ${plan.price} →`}
              </button>
              <p style={{ fontFamily: 'DM Mono,monospace', fontSize: 10, color: '#4a6080', textAlign: 'center', marginTop: 14, lineHeight: 1.7 }}>We'll email you within 24 hours to confirm and arrange payment.<br/>No charge until you approve.</p>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>✦</div>
              <div style={{ fontFamily: 'Playfair Display,serif', fontSize: 28, color: '#c8ff00', marginBottom: 12 }}>Request sent.</div>
              <p style={{ fontFamily: 'Crimson Pro,serif', fontSize: 18, color: '#8fa8cc', lineHeight: 1.7, marginBottom: 28 }}>We've received your request for <strong style={{ color: '#e8ecf8' }}>{plan.name}</strong> and sent a confirmation to <strong style={{ color: '#e8ecf8' }}>{email}</strong>.<br/><br/>We'll be in touch within 24 hours.</p>
              <button onClick={onClose} style={{ background: '#c8ff00', color: '#0a0e1a', border: 'none', borderRadius: 5, padding: '14px 32px', fontFamily: 'DM Mono,monospace', fontSize: 12, fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', cursor: 'pointer' }}>Done →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
