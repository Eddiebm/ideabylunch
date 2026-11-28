'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Generation {
  id: string
  source: string
  comparison_set: string | null
  candidate_id: string | null
  candidate_label: string | null
  run_number: string | null
  product_name: string | null
  brief_text: string | null
  model: string
  temperature: number | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
  elapsed_ms: number | null
  html_bytes: number | null
  generated_at: string
  approval_status: 'pending' | 'approved' | 'rejected'
  approval_reason: string | null
  approved_at: string | null
  quality_score: number | null
  quality_notes: string | null
}

interface Meta {
  total: number
  totalCostUSD: number
  models: string[]
  comparisonSets: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const MODEL_SHORT: Record<string, string> = {
  'google/gemini-2.5-flash': 'Gemini Flash',
  'google/gemini-2.5-pro': 'Gemini Pro',
  'anthropic/claude-fable-5-2': 'Fable 5.2',
  'openai/gpt-4o': 'GPT-4o',
}
const shortModel = (m: string) => MODEL_SHORT[m] || m.split('/').pop() || m

function fmtCost(usd: number | null) {
  if (usd === null) return '—'
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`
  return `$${usd.toFixed(4)}`
}

function fmtBytes(b: number | null) {
  if (!b) return '—'
  return `${(b / 1024).toFixed(0)}KB`
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#6E6E73',
  approved: '#30D158',
  rejected: '#FF3B30',
}

const MODEL_HUE: Record<string, string> = {
  'google/gemini-2.5-flash': '#0A84FF',
  'google/gemini-2.5-pro': '#5AC8FA',
  'anthropic/claude-fable-5-2': '#FF9F0A',
  'openai/gpt-4o': '#30D158',
}
const modelColor = (m: string) => MODEL_HUE[m] || '#8E8E93'

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ gen, secret, onClose }: { gen: Generation; secret: string; onClose: () => void }) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')
  const [approveOpen, setApproveOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [score, setScore] = useState(gen.quality_score?.toString() || '')
  const [notes, setNotes] = useState(gen.quality_notes || '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(gen.approval_status)

  const previewUrl = `/api/observatory/preview/${gen.id}?ak=${encodeURIComponent(secret)}`

  async function doAction(action: string, extra?: object) {
    setSaving(true)
    await fetch('/api/observatory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ id: gen.id, action, reason: reason || undefined, ...extra }),
    })
    if (action === 'approve') setStatus('approved')
    if (action === 'reject') setStatus('rejected')
    setSaving(false)
    setApproveOpen(false)
  }

  async function saveScore() {
    setSaving(true)
    await fetch('/api/observatory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ id: gen.id, action: 'score', qualityScore: Number(score) || undefined, qualityNotes: notes || undefined }),
    })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 1000, display: 'flex', flexDirection: 'column' }} onClick={onClose}>
      {/* Header */}
      <div style={{ background: '#1C1C1E', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
            {gen.candidate_label || gen.id}
          </div>
          <div style={{ fontSize: 12, color: '#8E8E93' }}>
            {gen.product_name} · {shortModel(gen.model)} · {fmtCost(gen.cost_usd)} · {fmtBytes(gen.html_bytes)}
          </div>
        </div>
        {/* Viewport toggle */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['desktop', 'mobile'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? '#3A3A3C' : 'transparent',
              border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, color: '#fff', cursor: 'pointer',
            }}>{v === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}</button>
          ))}
        </div>
        {/* Approval actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLOR[status], alignSelf: 'center' }}>
            {status.toUpperCase()}
          </span>
          {status === 'pending' && (
            <>
              <button onClick={() => setApproveOpen(true)} style={{ background: '#30D15822', border: '1px solid #30D15866', borderRadius: 8, padding: '5px 14px', fontSize: 13, color: '#30D158', cursor: 'pointer' }}>
                ✓ Approve
              </button>
              <button onClick={() => doAction('reject')} style={{ background: '#FF3B3022', border: '1px solid #FF3B3066', borderRadius: 8, padding: '5px 14px', fontSize: 13, color: '#FF3B30', cursor: 'pointer' }}>
                ✗ Reject
              </button>
            </>
          )}
          {status !== 'pending' && (
            <button onClick={() => { setStatus('pending') }} style={{ background: 'transparent', border: '1px solid #3A3A3C', borderRadius: 8, padding: '5px 14px', fontSize: 12, color: '#8E8E93', cursor: 'pointer' }}>
              Reset
            </button>
          )}
        </div>
        <button onClick={onClose} style={{ background: '#3A3A3C', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 16, color: '#fff', cursor: 'pointer', flexShrink: 0 }}>✕</button>
      </div>

      {/* Approve modal */}
      {approveOpen && (
        <div style={{ position: 'absolute', top: 60, right: 20, background: '#2C2C2E', borderRadius: 12, padding: 16, zIndex: 10, width: 320 }} onClick={e => e.stopPropagation()}>
          <p style={{ color: '#fff', fontSize: 14, margin: '0 0 10px' }}>Approval note (optional)</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="What stood out?" style={{ width: '100%', background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 8, padding: 8, color: '#fff', fontSize: 13, resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => doAction('approve')} disabled={saving} style={{ flex: 1, background: '#30D158', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, color: '#000', cursor: 'pointer', fontWeight: 600 }}>
              {saving ? 'Saving…' : 'Confirm approve'}
            </button>
            <button onClick={() => setApproveOpen(false)} style={{ background: '#3A3A3C', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#fff', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* iframe preview */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 20px 0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: view === 'desktop' ? '100%' : 375,
          height: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid #3A3A3C',
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          transition: 'width 0.3s ease',
        }}>
          <iframe
            src={previewUrl}
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
            title={gen.candidate_label || gen.id}
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>

      {/* Quality scoring panel */}
      <div style={{ background: '#1C1C1E', padding: '10px 20px 12px', display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#8E8E93' }}>Quality score (0–100)</span>
          <input
            type="number" min="0" max="100" value={score}
            onChange={e => setScore(e.target.value)}
            style={{ width: 60, background: '#2C2C2E', border: '1px solid #3A3A3C', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 13 }}
          />
        </div>
        <input
          type="text" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Notes…"
          style={{ flex: 1, background: '#2C2C2E', border: '1px solid #3A3A3C', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 13 }}
        />
        <button onClick={saveScore} disabled={saving} style={{ background: '#0A84FF', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, color: '#fff', cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save score'}
        </button>
        {/* Brief snippet */}
        {gen.brief_text && (
          <details style={{ marginLeft: 'auto' }}>
            <summary style={{ fontSize: 12, color: '#8E8E93', cursor: 'pointer' }}>View brief</summary>
            <div style={{ position: 'absolute', bottom: 60, right: 20, background: '#2C2C2E', borderRadius: 12, padding: 16, maxWidth: 400, maxHeight: 200, overflow: 'auto', fontSize: 12, color: '#fff', whiteSpace: 'pre-wrap', zIndex: 10 }}>
              {gen.brief_text}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// ── Comparison View ───────────────────────────────────────────────────────────

function ComparisonView({ gens, secret }: { gens: Generation[]; secret: string }) {
  const [selected, setSelected] = useState<string[]>(gens.slice(0, 2).map(g => g.id))
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop')
  const [revealed, setRevealed] = useState(false)

  const left = gens.find(g => g.id === selected[0])
  const right = gens.find(g => g.id === selected[1])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={selected[0]} onChange={e => setSelected([e.target.value, selected[1]])} style={{ background: '#2C2C2E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 13, flex: 1 }}>
          {gens.map(g => <option key={g.id} value={g.id}>{g.candidate_label || g.id}</option>)}
        </select>
        <span style={{ color: '#8E8E93', fontSize: 12 }}>vs</span>
        <select value={selected[1]} onChange={e => setSelected([selected[0], e.target.value])} style={{ background: '#2C2C2E', border: '1px solid #3A3A3C', padding: '6px 10px', borderRadius: 8, color: '#fff', fontSize: 13, flex: 1 }}>
          {gens.map(g => <option key={g.id} value={g.id}>{g.candidate_label || g.id}</option>)}
        </select>
        <button onClick={() => setView(v => v === 'desktop' ? 'mobile' : 'desktop')} style={{ background: '#3A3A3C', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#fff', cursor: 'pointer' }}>
          {view === 'desktop' ? '🖥' : '📱'}
        </button>
        <button onClick={() => setRevealed(r => !r)} style={{ background: revealed ? '#FF9F0A22' : '#3A3A3C', border: revealed ? '1px solid #FF9F0A66' : 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: revealed ? '#FF9F0A' : '#fff', cursor: 'pointer' }}>
          {revealed ? '🔓 Revealed' : '🔒 Reveal models'}
        </button>
      </div>
      {/* Iframes */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, minHeight: 0 }}>
        {[left, right].map((gen, i) => gen ? (
          <div key={gen.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
            <div style={{ background: '#2C2C2E', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {revealed ? gen.candidate_label : `Candidate ${String.fromCharCode(65 + i)}`}
              </span>
              {revealed && (
                <span style={{ fontSize: 11, color: modelColor(gen.model), background: modelColor(gen.model) + '22', borderRadius: 6, padding: '2px 8px' }}>
                  {shortModel(gen.model)}
                </span>
              )}
            </div>
            <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid #3A3A3C', display: 'flex', justifyContent: 'center', background: '#fff', minHeight: 0 }}>
              <iframe
                src={`/api/observatory/preview/${gen.id}?ak=${encodeURIComponent(secret)}`}
                style={{ width: view === 'desktop' ? '100%' : 375, height: '100%', border: 'none' }}
                sandbox="allow-same-origin allow-scripts"
                title={gen.candidate_label || gen.id}
              />
            </div>
          </div>
        ) : (
          <div key={i} style={{ background: '#2C2C2E', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8E8E93', fontSize: 13 }}>
            Select a generation
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Gallery Card ──────────────────────────────────────────────────────────────

function GenerationCard({ gen, secret, onSelect }: { gen: Generation; secret: string; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: '#1C1C1E',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid #3A3A3C',
        transition: 'border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#636366')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#3A3A3C')}
    >
      {/* Thumbnail iframe */}
      <div style={{ height: 200, background: '#fff', position: 'relative', overflow: 'hidden' }}>
        <iframe
          src={`/api/observatory/preview/${gen.id}?ak=${encodeURIComponent(secret)}`}
          style={{ width: '200%', height: '200%', border: 'none', transformOrigin: '0 0', transform: 'scale(0.5)', pointerEvents: 'none' }}
          sandbox="allow-same-origin allow-scripts"
          loading="lazy"
          title={gen.id}
        />
        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: STATUS_COLOR[gen.approval_status] + '22',
          border: `1px solid ${STATUS_COLOR[gen.approval_status]}66`,
          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
          color: STATUS_COLOR[gen.approval_status],
        }}>
          {gen.approval_status}
        </div>
        {gen.quality_score !== null && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: '#000a', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700,
            color: gen.quality_score >= 80 ? '#30D158' : gen.quality_score >= 60 ? '#FF9F0A' : '#FF3B30',
          }}>
            {gen.quality_score}/100
          </div>
        )}
      </div>
      {/* Meta */}
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {gen.candidate_label || gen.id}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: modelColor(gen.model), background: modelColor(gen.model) + '22', borderRadius: 5, padding: '1px 6px' }}>
            {shortModel(gen.model)}
          </span>
          {gen.comparison_set && (
            <span style={{ fontSize: 11, color: '#8E8E93', background: '#2C2C2E', borderRadius: 5, padding: '1px 6px' }}>
              {gen.comparison_set}
            </span>
          )}
          {gen.run_number && (
            <span style={{ fontSize: 11, color: '#8E8E93', background: '#2C2C2E', borderRadius: 5, padding: '1px 6px' }}>
              run {gen.run_number}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#636366' }}>
          <span>{fmtCost(gen.cost_usd)}</span>
          <span>{fmtBytes(gen.html_bytes)}</span>
          <span>{gen.output_tokens ? `${gen.output_tokens.toLocaleString()}t` : '—'}</span>
        </div>
        <div style={{ fontSize: 11, color: '#636366', marginTop: 4 }}>{fmtDate(gen.generated_at)}</div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ObservatoryPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gens, setGens] = useState<Generation[]>([])
  const [meta, setMeta] = useState<Meta | null>(null)
  const [selected, setSelected] = useState<Generation | null>(null)
  const [tab, setTab] = useState<'gallery' | 'compare'>('gallery')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterSet, setFilterSet] = useState('')

  const load = useCallback(async (s = secret) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/observatory', { headers: { 'x-admin-secret': s } })
      if (res.status === 401) { setError('Wrong password'); setLoading(false); return }
      const d = await res.json()
      if (d.error) { setError(d.error); setLoading(false); return }
      setGens(d.generations || [])
      setMeta(d.meta || null)
      setAuthed(true)
    } catch { setError('Failed to load') }
    setLoading(false)
  }, [secret])

  const filtered = gens.filter(g => {
    if (filterStatus && g.approval_status !== filterStatus) return false
    if (filterModel && g.model !== filterModel) return false
    if (filterSet && g.comparison_set !== filterSet) return false
    return true
  })

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ background: '#1C1C1E', borderRadius: 20, padding: 36, width: 340, border: '1px solid #3A3A3C' }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>🔭</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Quality Observatory</h1>
        <p style={{ fontSize: 13, color: '#8E8E93', margin: '0 0 20px' }}>Private admin access only</p>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="AUDIT_SECRET"
          autoFocus
          style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #3A3A3C', background: '#2C2C2E', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />
        {error && <p style={{ fontSize: 13, color: '#FF3B30', margin: '0 0 10px' }}>{error}</p>}
        <button onClick={() => load()} disabled={loading} style={{ width: '100%', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Loading…' : 'Enter Observatory →'}
        </button>
      </div>
    </div>
  )

  const totalCost = meta?.totalCostUSD ?? 0
  const models = meta?.models ?? []
  const sets = meta?.comparisonSets ?? []

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#fff' }}>
      {/* Nav */}
      <nav style={{ background: '#1C1C1E', borderBottom: '0.5px solid #3A3A3C', padding: '0 20px', height: 52, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 16 }}>🔭</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Quality Observatory</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {(['gallery', 'compare'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? '#3A3A3C' : 'transparent',
              border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 13,
              color: tab === t ? '#fff' : '#8E8E93', cursor: 'pointer', fontWeight: tab === t ? 600 : 400,
              textTransform: 'capitalize',
            }}>
              {t === 'gallery' ? '⊞ Gallery' : '⇔ Compare'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* Summary stats */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#8E8E93' }}>
          <span>{gens.length} generations</span>
          <span style={{ color: '#FF9F0A' }}>${totalCost.toFixed(4)} total cost</span>
          <span style={{ color: '#30D158' }}>{gens.filter(g => g.approval_status === 'approved').length} approved</span>
        </div>
        <button onClick={() => load()} style={{ background: '#2C2C2E', border: 'none', borderRadius: 8, padding: '5px 14px', fontSize: 12, color: '#fff', cursor: 'pointer' }}>↻</button>
      </nav>

      <div style={{ maxWidth: tab === 'compare' ? '100%' : 1400, margin: '0 auto', padding: tab === 'compare' ? '16px 20px' : '20px', height: tab === 'compare' ? 'calc(100vh - 52px)' : 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Filters (gallery only) */}
        {tab === 'gallery' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13 }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filterModel} onChange={e => setFilterModel(e.target.value)} style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13 }}>
              <option value="">All models</option>
              {models.map(m => <option key={m} value={m}>{shortModel(m)}</option>)}
            </select>
            {sets.length > 0 && (
              <select value={filterSet} onChange={e => setFilterSet(e.target.value)} style={{ background: '#1C1C1E', border: '1px solid #3A3A3C', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13 }}>
                <option value="">All sets</option>
                {sets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <span style={{ fontSize: 13, color: '#8E8E93', alignSelf: 'center', marginLeft: 'auto' }}>
              {filtered.length} of {gens.length}
            </span>
          </div>
        )}

        {/* Gallery */}
        {tab === 'gallery' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {filtered.map(g => (
              <GenerationCard key={g.id} gen={g} secret={secret} onSelect={() => setSelected(g)} />
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#636366', fontSize: 14 }}>
                No generations match the current filters
              </div>
            )}
          </div>
        )}

        {/* Compare */}
        {tab === 'compare' && (
          <div style={{ flex: 1, minHeight: 0 }}>
            <ComparisonView gens={gens} secret={secret} />
          </div>
        )}
      </div>

      {/* Preview modal */}
      {selected && (
        <PreviewModal gen={selected} secret={secret} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
