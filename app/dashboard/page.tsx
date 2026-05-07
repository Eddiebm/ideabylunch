'use client'
export const runtime = 'edge'
import { useState, useEffect } from 'react'

type Slot = 'heroHeadline' | 'aboutText' | 'servicesList' | 'contactInfo' | 'footerTagline'

const SLOT_LABELS: Record<Slot, { label: string; hint: string; multiline?: boolean }> = {
  heroHeadline:  { label: 'Hero headline',    hint: 'The big text visitors see first. e.g. "Accra\'s most trusted plumber"' },
  aboutText:     { label: 'About section',    hint: 'A short paragraph about your business.', multiline: true },
  servicesList:  { label: 'Services',         hint: 'List your services, separated by commas.', multiline: true },
  contactInfo:   { label: 'Contact info',     hint: 'Phone, email, address — however you want it shown.' },
  footerTagline: { label: 'Footer tagline',   hint: 'A short sign-off line. e.g. "Open 7 days a week"' },
}

interface Order {
  productName: string
  liveUrl: string
  projectSlug: string
  deployedAt: number
  lastEditedAt?: number
  slots?: Partial<Record<Slot, string>>
  status: string
}

export default function DashboardPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Slot | null>(null)
  const [values, setValues] = useState<Partial<Record<Slot, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<Record<Slot, 'idle' | 'saving' | 'saved' | 'error'>>({} as any)
  const [isPro, setIsPro] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/dashboard/me')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setOrder(d.order)
        setValues(d.order?.slots || {})
        setIsPro(d.isPro || false)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load dashboard'); setLoading(false) })
  }, [])

  async function saveSlot(slot: Slot) {
    setSaving(true)
    setSaveStatus(s => ({ ...s, [slot]: 'saving' }))
    try {
      const res = await fetch('/api/dashboard/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, value: values[slot] || '' }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.upgradeRequired) {
          setSaveStatus(s => ({ ...s, [slot]: 'error' }))
          alert('Free tier: 1 edit per week. Upgrade to Pro for unlimited edits.')
          return
        }
        throw new Error(data.error)
      }
      setSaveStatus(s => ({ ...s, [slot]: 'saved' }))
      setEditing(null)
      if (data.liveUrl && order) setOrder({ ...order, liveUrl: data.liveUrl, lastEditedAt: Date.now() })
      setTimeout(() => setSaveStatus(s => ({ ...s, [slot]: 'idle' })), 3000)
    } catch (e: any) {
      setSaveStatus(s => ({ ...s, [slot]: 'error' }))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
      <p style={{ color: '#6E6E73', fontSize: 15 }}>Loading your dashboard...</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#FF3B30', fontSize: 15, marginBottom: 16 }}>{error}</p>
        <a href="/login" style={{ color: '#0066CC', fontSize: 15 }}>← Back to login</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>IdeaByLunch</a>
        <span style={{ fontSize: 13, color: '#6E6E73' }}>My dashboard</span>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 60px' }}>

        {/* Site card */}
        {order && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', margin: '0 0 4px' }}>{order.productName || 'Your site'}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158' }} />
                  <span style={{ fontSize: 13, color: '#6E6E73' }}>Live</span>
                </div>
              </div>
              <a
                href={order.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#1D1D1F', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
              >
                Visit site →
              </a>
            </div>
            <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#6E6E73', wordBreak: 'break-all' }}>
              {order.liveUrl}
            </div>
            {order.lastEditedAt && (
              <p style={{ fontSize: 12, color: '#AEAEB2', margin: '8px 0 0' }}>
                Last updated {new Date(order.lastEditedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Pro badge */}
        {!isPro && (
          <div style={{ background: '#FFF9E6', border: '1px solid #FFE082', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 2px' }}>Free tier — 1 edit per week</p>
              <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>Upgrade to Pro for unlimited edits.</p>
            </div>
            <a
              href="/api/dashboard/upgrade"
              style={{ background: '#1D1D1F', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Upgrade — $19/mo
            </a>
          </div>
        )}

        {/* Content slots */}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>Edit your site content</h3>

        {(Object.keys(SLOT_LABELS) as Slot[]).map(slot => {
          const { label, hint, multiline } = SLOT_LABELS[slot]
          const status = saveStatus[slot] || 'idle'
          const isEditing = editing === slot

          return (
            <div key={slot} style={{ background: '#fff', borderRadius: 14, padding: 20, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEditing ? 12 : 0 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '0 0 2px' }}>{label}</p>
                  {!isEditing && (
                    <p style={{ fontSize: 13, color: values[slot] ? '#1D1D1F' : '#AEAEB2', margin: 0 }}>
                      {values[slot] || hint}
                    </p>
                  )}
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setEditing(slot)}
                    style={{ background: '#F2F2F7', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 500, color: '#1D1D1F', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditing && (
                <>
                  <p style={{ fontSize: 12, color: '#AEAEB2', margin: '0 0 8px' }}>{hint}</p>
                  {multiline ? (
                    <textarea
                      value={values[slot] || ''}
                      onChange={e => setValues(v => ({ ...v, [slot]: e.target.value }))}
                      rows={4}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 10 }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[slot] || ''}
                      onChange={e => setValues(v => ({ ...v, [slot]: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #D2D2D7', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => saveSlot(slot)}
                      disabled={saving}
                      style={{ background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
                    >
                      {status === 'saving' ? 'Saving...' : status === 'saved' ? '✓ Saved' : 'Save & deploy'}
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      style={{ background: 'transparent', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 14, color: '#6E6E73', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                  {status === 'error' && (
                    <p style={{ fontSize: 13, color: '#FF3B30', marginTop: 8 }}>Save failed. Try again.</p>
                  )}
                  {status === 'saved' && (
                    <p style={{ fontSize: 13, color: '#30D158', marginTop: 8 }}>Site redeploying — live in ~30 seconds.</p>
                  )}
                </>
              )}
            </div>
          )
        })}

        {/* Upsells */}
        <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <a href="/logo" style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)', textDecoration: 'none', display: 'block' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>Add a logo</p>
            <p style={{ fontSize: 13, color: '#6E6E73', margin: '0 0 12px' }}>3 AI-generated concepts</p>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0066CC' }}>From $99 →</span>
          </a>
          <a href="/taglines" style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)', textDecoration: 'none', display: 'block' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>Tagline pack</p>
            <p style={{ fontSize: 13, color: '#6E6E73', margin: '0 0 12px' }}>10 punchy taglines for your brand</p>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0066CC' }}>$29 →</span>
          </a>
        </div>
      </div>
    </div>
  )
}
