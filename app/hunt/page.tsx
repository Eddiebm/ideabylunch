'use client'
export const runtime = 'edge'
import { useState } from 'react'

interface Business {
  name: string
  phone: string | null
  address: string | null
  website: string | null
  rating: number | null
  reviews: number | null
  category: string | null
  score: number
  reasons: string[]
  priority: 'high' | 'medium' | 'low' | 'no-site'
}

interface CampaignEntry extends Business {
  status: 'queued' | 'building' | 'built' | 'finding-email' | 'sending' | 'sent' | 'skipped' | 'error'
  html?: string
  previewUrl?: string
  email?: string
  emailConfidence?: number
  error?: string
}

const PRIORITY_COLORS = {
  'high': '#f87171',
  'medium': '#fbbf24',
  'low': '#4ade80',
  'no-site': '#c8ff00',
}

const STATUS_COLORS: Record<string, string> = {
  'queued': '#4a6080',
  'building': '#60a5fa',
  'built': '#a78bfa',
  'sending': '#fbbf24',
  'sent': '#4ade80',
  'skipped': '#4a6080',
  'error': '#f87171',
}

export default function HuntMode() {
  const [city, setCity] = useState('St. Louis')
  const [industry, setIndustry] = useState('plumbers')
  const [limit, setLimit] = useState(20)
  const [phase, setPhase] = useState<'idle' | 'scraping' | 'ready' | 'running' | 'done'>('idle')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [campaign, setCampaign] = useState<CampaignEntry[]>([])
  const [error, setError] = useState('')
  const [log, setLog] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<Set<string>>(new Set(['high', 'no-site']))
  const [previewEntry, setPreviewEntry] = useState<CampaignEntry | null>(null)
  const [stats, setStats] = useState({ built: 0, sent: 0, skipped: 0, errors: 0 })

  function addLog(msg: string) {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)])
  }

  function updateEntry(idx: number, update: Partial<CampaignEntry>) {
    setCampaign(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...update }
      return next
    })
  }

  async function runScrape() {
    setPhase('scraping')
    setError('')
    setBusinesses([])
    setCampaign([])
    setLog([])
    addLog(`Searching for ${industry} in ${city}...`)

    try {
      const res = await fetch('/api/hunt/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, industry, limit })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Scrape failed')

      addLog(`Found ${data.total} businesses`)
      addLog(`${data.prospects?.length || 0} high-priority prospects`)
      setBusinesses(data.all || [])
      setPhase('ready')
    } catch (e: any) {
      setError(e.message)
      setPhase('idle')
    }
  }

  async function runCampaign() {
    const targets = businesses.filter(b => selectedPriorities.has(b.priority))
    if (!targets.length) { setError('No businesses selected'); return }

    const entries: CampaignEntry[] = targets.map(b => ({ ...b, status: 'queued' }))
    setCampaign(entries)
    setPhase('running')
    setStats({ built: 0, sent: 0, skipped: 0, errors: 0 })
    addLog(`Starting campaign: ${entries.length} targets`)

    for (let i = 0; i < entries.length; i++) {
      const b = entries[i]
      addLog(`[${i + 1}/${entries.length}] ${b.name}`)

      try {
        // ── Step 1: Find email FIRST — only build if we can reach them ──────
        if (!b.website) {
          updateEntry(i, { status: 'skipped', error: 'No website — cannot find email' })
          setStats(s => ({ ...s, skipped: s.skipped + 1 }))
          addLog(`⊘ Skipped: no website`)
          continue
        }

        updateEntry(i, { status: 'finding-email' })
        addLog(`Finding email for ${b.name}...`)

        const emailRes = await fetch('/api/hunt/outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: b.name,
            website: b.website,
            phone: b.phone,
            address: b.address,
            city,
            industry,
            previewUrl: 'PENDING', // placeholder — will update after build
            checkEmailOnly: true,  // signal to just find email, not send yet
          })
        })

        const emailData = await emailRes.json()

        if (emailData.status !== 'email_found') {
          updateEntry(i, { status: 'skipped', error: emailData.message || 'No email found' })
          setStats(s => ({ ...s, skipped: s.skipped + 1 }))
          addLog(`⊘ No email: ${b.name}`)
          if (i < entries.length - 1) await new Promise(r => setTimeout(r, 500))
          continue
        }

        addLog(`✓ Email found: ${emailData.email} (${emailData.confidence}%)`)

        // ── Step 2: Build site — only because we have an email to send to ───
        updateEntry(i, { status: 'building' })
        addLog(`Building site for ${b.name}...`)

        const buildRes = await fetch('/api/hunt/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: b.name,
            website: b.website,
            phone: b.phone,
            address: b.address,
            city,
            industry,
            category: b.category,
          })
        })

        const buildData = await buildRes.json()
        if (!buildRes.ok || !buildData.html) throw new Error(buildData.error || 'Build failed')

        updateEntry(i, { status: 'built', html: buildData.html, previewUrl: buildData.previewUrl })
        setStats(s => ({ ...s, built: s.built + 1 }))
        addLog(`✓ Built: ${b.name}`)

        // ── Step 3: Send outreach with real preview URL ────────────────────
        updateEntry(i, { status: 'sending' })

        const outreachRes = await fetch('/api/hunt/outreach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: b.name,
            website: b.website,
            phone: b.phone,
            address: b.address,
            city,
            industry,
            previewUrl: buildData.previewUrl || `https://ideabylunch.com/preview/${buildData.token}`,
            checkEmailOnly: false,
          })
        })

        const outreachData = await outreachRes.json()

        if (outreachData.status === 'sent') {
          updateEntry(i, { status: 'sent', email: outreachData.email, emailConfidence: outreachData.confidence })
          setStats(s => ({ ...s, sent: s.sent + 1 }))
          addLog(`✉ Sent to ${outreachData.email} (${outreachData.confidence}% confidence)`)
        } else {
          updateEntry(i, { status: 'skipped', error: outreachData.message })
          setStats(s => ({ ...s, skipped: s.skipped + 1 }))
          addLog(`⊘ ${outreachData.message}`)
        }

        if (i < entries.length - 1) await new Promise(r => setTimeout(r, 2000))

      } catch (e: any) {
        updateEntry(i, { status: 'error', error: e.message })
        setStats(s => ({ ...s, errors: s.errors + 1 }))
        addLog(`✗ Error: ${b.name} — ${e.message}`)
      }
    }

    setPhase('done')
    addLog(`Done. Built: ${stats.built} | Sent: ${stats.sent} | Skipped: ${stats.skipped}`)
  }

  const displayList = campaign.length > 0
    ? campaign
    : businesses.filter(b => selectedPriorities.has(b.priority))

  return (
    <main style={{ paddingTop: 68, minHeight: '100vh', background: '#070B14', color: '#E8ECF8' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        input,select { background:#0D1220;border:1px solid #1B2A3E;border-radius:4px;padding:10px 14px;font-family:monospace;font-size:13px;color:#E8ECF8;outline:none; }
        input:focus,select:focus { border-color:#C9A84C; }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#0D1220}
        ::-webkit-scrollbar-thumb{background:#1B3A2D;border-radius:2px}
      `}</style>

      {/* Preview modal */}
      {previewEntry?.html && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', zIndex: 1000, display: 'flex', flexDirection: 'column' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#0A0E1A', borderBottom: '1px solid #1B2A3E' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#C9A84C' }}>Preview — {previewEntry.name}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href={`mailto:hello@ideabylunch.com?subject=Keep my site - ${previewEntry.name}`}
                style={{ background: '#C9A84C', color: '#070B14', padding: '6px 16px', borderRadius: 3, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textDecoration: 'none' }}>
                Send Outreach →
              </a>
              <button onClick={() => setPreviewEntry(null)}
                style={{ background: 'none', border: '1px solid #1B2A3E', borderRadius: 3, padding: '6px 14px', fontFamily: 'monospace', fontSize: 11, color: '#4a6080', cursor: 'pointer' }}>
                ✕ Close
              </button>
            </div>
          </div>
          <iframe
            srcDoc={previewEntry.html}
            style={{ flex: 1, border: 'none', width: '100%' }}
            sandbox="allow-scripts allow-same-origin"
            title="Preview"
          />
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36, borderBottom: '1px solid rgba(201,168,76,.15)', paddingBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase' as const, color: '#C9A84C' }}>IdeaByLunch</span>
            <span style={{ color: '#1B2A3E' }}>·</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase' as const, color: '#4a6080' }}>Hunt Mode — Outbound</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(200,255,0,.06)', border: '1px solid rgba(200,255,0,.2)', borderRadius: 3, padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'running' ? '#C8FF00' : '#1B2A3E', animation: phase === 'running' ? 'pulse 1s ease infinite' : 'none' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#C8FF00', letterSpacing: '.1em' }}>
                {{ idle: 'READY', scraping: 'SCRAPING...', ready: 'PROSPECTS READY', running: 'RUNNING', done: 'DONE' }[phase]}
              </span>
            </div>
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 400, color: '#E8ECF8', margin: 0 }}>
            Hunt Mode — <em style={{ fontStyle: 'italic', color: '#C9A84C' }}>Find · Rebuild · Sell</em>
          </h1>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px auto', gap: 12, marginBottom: 20, alignItems: 'end' }}>
          <div>
            <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#4a6080', display: 'block', marginBottom: 6 }}>City</label>
            <input value={city} onChange={e => setCity(e.target.value)} disabled={phase === 'running' || phase === 'scraping'} style={{ width: '100%', boxSizing: 'border-box' as const }} />
          </div>
          <div>
            <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#4a6080', display: 'block', marginBottom: 6 }}>Industry</label>
            <input value={industry} onChange={e => setIndustry(e.target.value)} disabled={phase === 'running' || phase === 'scraping'} style={{ width: '100%', boxSizing: 'border-box' as const }} />
          </div>
          <div>
            <label style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#4a6080', display: 'block', marginBottom: 6 }}>Limit</label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} disabled={phase === 'running' || phase === 'scraping'} style={{ width: '100%' }}>
              {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button onClick={runScrape} disabled={phase === 'scraping' || phase === 'running'}
            style={{ background: '#1B3A2D', color: '#C9A84C', border: '1px solid rgba(201,168,76,.3)', borderRadius: 4, padding: '10px 20px', fontFamily: 'monospace', fontSize: 11, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase' as const, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
            {phase === 'scraping' ? '⟳ Scraping...' : '⌖ Find Prospects'}
          </button>
        </div>

        {error && <div style={{ background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 4, padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: '#f87171', marginBottom: 16 }}>⚠ {error}</div>}

        {/* Stats */}
        {campaign.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, marginBottom: 20 }}>
            {[
              { label: 'Built', value: stats.built, color: '#a78bfa' },
              { label: 'Sent', value: stats.sent, color: '#4ade80' },
              { label: 'Skipped', value: stats.skipped, color: '#4a6080' },
              { label: 'Errors', value: stats.errors, color: '#f87171' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0D1220', border: '1px solid #1B2A3E', borderRadius: 4, padding: '14px', textAlign: 'center' as const }}>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#4a6080', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

          {/* Business list */}
          <div>
            {businesses.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' as const }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#4a6080', letterSpacing: '.1em', textTransform: 'uppercase' as const }}>Filter:</span>
                {(['no-site', 'high', 'medium', 'low'] as const).map(p => (
                  <button key={p} onClick={() => setSelectedPriorities(prev => {
                    const next = new Set(prev); next.has(p) ? next.delete(p) : next.add(p); return next
                  })} style={{ background: selectedPriorities.has(p) ? `${PRIORITY_COLORS[p]}15` : 'transparent', border: `1px solid ${selectedPriorities.has(p) ? PRIORITY_COLORS[p] : '#1B2A3E'}`, borderRadius: 3, padding: '4px 10px', fontFamily: 'monospace', fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: selectedPriorities.has(p) ? PRIORITY_COLORS[p] : '#4a6080', cursor: 'pointer' }}>
                    {p === 'no-site' ? 'No website' : p} ({businesses.filter(b => b.priority === p).length})
                  </button>
                ))}
                {phase === 'ready' && (
                  <button onClick={runCampaign} style={{ marginLeft: 'auto', background: '#C9A84C', color: '#070B14', border: 'none', borderRadius: 4, padding: '8px 20px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, cursor: 'pointer' }}>
                    ⚡ Run Campaign ({businesses.filter(b => selectedPriorities.has(b.priority)).length})
                  </button>
                )}
              </div>
            )}

            {displayList.length > 0 && (
              <div style={{ background: '#0D1220', border: '1px solid #1B2A3E', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 90px 80px', padding: '8px 16px', background: '#0A0E1A', borderBottom: '1px solid #1B2A3E' }}>
                  {['Business', 'Score', 'Priority', 'Status', 'Preview'].map(h => (
                    <span key={h} style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#4a6080' }}>{h}</span>
                  ))}
                </div>
                {displayList.map((b, i) => {
                  const entry = b as CampaignEntry
                  const statusColor = entry.status ? STATUS_COLORS[entry.status] : '#4a6080'
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px 90px 80px', padding: '10px 16px', borderBottom: i < displayList.length - 1 ? '1px solid #0D1625' : 'none', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.01)' }}>
                      <div>
                        <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#E8ECF8' }}>{b.name}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#4a6080', marginTop: 2 }}>
                          {b.website ? b.website.replace(/https?:\/\/(www\.)?/, '').slice(0, 30) : 'no website'}
                        </div>
                        {entry.email && <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#4ade80', marginTop: 2 }}>✉ {entry.email}</div>}
                        {entry.error && <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#f87171', marginTop: 2 }}>✗ {entry.error}</div>}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: b.score < 40 ? '#f87171' : b.score < 60 ? '#fbbf24' : '#4ade80', alignSelf: 'center' }}>
                        {b.score > 0 ? b.score : '—'}
                      </div>
                      <div style={{ alignSelf: 'center' }}>
                        <span style={{ background: `${PRIORITY_COLORS[b.priority]}15`, border: `1px solid ${PRIORITY_COLORS[b.priority]}44`, borderRadius: 3, padding: '2px 7px', fontFamily: 'monospace', fontSize: 8, textTransform: 'uppercase' as const, color: PRIORITY_COLORS[b.priority] }}>
                          {b.priority === 'no-site' ? 'no site' : b.priority}
                        </span>
                      </div>
                      <div style={{ alignSelf: 'center' }}>
                        {entry.status && (
                          <span style={{ background: `${statusColor}12`, border: `1px solid ${statusColor}33`, borderRadius: 3, padding: '2px 7px', fontFamily: 'monospace', fontSize: 8, textTransform: 'uppercase' as const, color: statusColor }}>
                            {entry.status === 'building' && <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: statusColor, animation: 'pulse 1s ease infinite', marginRight: 4 }} />}
                            {entry.status}
                          </span>
                        )}
                      </div>
                      <div style={{ alignSelf: 'center' }}>
                        {entry.html && (
                          <button onClick={() => setPreviewEntry(entry)}
                            style={{ background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.3)', borderRadius: 3, padding: '4px 10px', fontFamily: 'monospace', fontSize: 8, color: '#a78bfa', cursor: 'pointer', letterSpacing: '.08em' }}>
                            View →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {businesses.length === 0 && phase === 'idle' && (
              <div style={{ background: '#0D1220', border: '1px solid #1B2A3E', borderRadius: 5, padding: '60px 32px', textAlign: 'center' as const }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>⌖</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#4a6080', marginBottom: 8 }}>No prospects yet</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#2a3a4a' }}>Set city and industry above, then click Find Prospects</div>
              </div>
            )}
          </div>

          {/* Activity log */}
          <div style={{ background: '#0A0E1A', border: '1px solid #1B2A3E', borderRadius: 5, overflow: 'hidden', position: 'sticky' as const, top: 88 }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1B2A3E', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: phase === 'running' ? '#C8FF00' : '#1B2A3E', animation: phase === 'running' ? 'pulse 1s ease infinite' : 'none' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#4a6080' }}>Activity Log</span>
            </div>
            <div style={{ padding: '10px 14px', maxHeight: 520, overflowY: 'auto' as const }}>
              {log.length === 0
                ? <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#2a3a4a' }}>Waiting to start...</div>
                : log.map((entry, i) => (
                  <div key={i} style={{ fontFamily: 'monospace', fontSize: 10, color: i === 0 ? '#E8ECF8' : '#4a6080', lineHeight: 1.7, borderBottom: i < log.length - 1 ? '1px solid #0D1220' : 'none', paddingBottom: 3, marginBottom: 3 }}>
                    {entry}
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
