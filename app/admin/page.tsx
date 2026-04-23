'use client'
import { useState, useEffect } from 'react'

function fmt$(n: number) { return '$' + (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(ts: number) { return ts ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' }

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#AEAEB2', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: color || '#1D1D1F', letterSpacing: '-1px', margin: '0 0 4px' }}>{value}</p>
      {sub && <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 12px' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function AdminPage() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'overview' | 'orders' | 'leads' | 'resellers' | 'costs'>('overview')

  async function load(s = secret) {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/admin/stats?secret=${encodeURIComponent(s)}`)
      if (res.status === 401) { setError('Wrong password'); setLoading(false); return }
      const d = await res.json()
      if (d.error) { setError(d.error); setLoading(false); return }
      setData(d); setAuthed(true)
    } catch { setError('Failed to load') }
    setLoading(false)
  }

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: 340, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', margin: '0 0 6px' }}>Admin</h1>
        <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 20px' }}>idea2Lunch command center</p>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="Admin password"
          autoFocus
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,.1)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
        />
        {error && <p style={{ fontSize: 13, color: '#FF3B30', margin: '0 0 10px' }}>{error}</p>}
        <button onClick={() => load()} disabled={loading} style={{ width: '100%', background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Loading…' : 'Enter →'}
        </button>
      </div>
    </div>
  )

  const ov = data?.overview || {}
  const orders = data?.orders || {}
  const leads = data?.leads || {}
  const customers = data?.customers || {}
  const content = data?.content || {}
  const resellers = data?.resellers || []
  const costs = data?.costs || {}

  // Source breakdown from leads
  const sourceMap: Record<string, number> = {}
  for (const l of leads.recent || []) {
    const s = l.source || 'direct'
    sourceMap[s] = (sourceMap[s] || 0) + 1
  }
  const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])

  const TABS = ['overview', 'orders', 'leads', 'resellers', 'costs'] as const

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F' }}>idea2Lunch Admin</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? '#1D1D1F' : 'transparent', color: tab === t ? '#fff' : '#6E6E73', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => load()} style={{ background: '#F2F2F7', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#1D1D1F', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Overview */}
        {tab === 'overview' && (
          <>
            <Section title="Revenue">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <StatCard label="Total Revenue" value={fmt$(ov.totalRevenue || 0)} color="#30D158" />
                <StatCard label="Express Revenue" value={fmt$(ov.expressRevenue || 0)} sub="Upsell fees" />
                <StatCard label="Est. Profit" value={fmt$((ov.estimatedProfit || 0) * 100)} sub={`${ov.margin || 0}% margin`} color="#0066CC" />
                <StatCard label="Est. Monthly Cost" value={`$${(costs.estimatedMonthlyCost || 0).toFixed(2)}`} sub="AI + infra" />
              </div>
            </Section>

            <Section title="Activity">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <StatCard label="Total Orders" value={String(orders.total || 0)} sub={`${orders.deployed || 0} deployed`} />
                <StatCard label="Total Leads" value={String(leads.total || 0)} sub="Email captured" />
                <StatCard label="Pro Customers" value={String(customers.pro || 0)} sub={`${customers.total || 0} total`} />
                <StatCard label="Sites Deployed" value={String(content.deploys || 0)} />
              </div>
            </Section>

            <Section title="Revenue by plan">
              <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                {Object.entries(orders.byPlan || {}).length === 0
                  ? <p style={{ color: '#AEAEB2', fontSize: 14, margin: 0 }}>No plan data yet</p>
                  : Object.entries(orders.byPlan || {}).sort((a: any, b: any) => b[1] - a[1]).map(([plan, amount]: any) => {
                    const pct = ov.totalRevenue > 0 ? Math.round((amount / ov.totalRevenue) * 100) : 0
                    return (
                      <div key={plan} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 90, fontSize: 13, fontWeight: 600, color: '#1D1D1F', textTransform: 'capitalize' }}>{plan}</div>
                        <div style={{ flex: 1, height: 8, background: '#F2F2F7', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#0066CC', borderRadius: 4, width: `${pct}%` }} />
                        </div>
                        <div style={{ width: 80, fontSize: 13, color: '#6E6E73', textAlign: 'right' }}>{fmt$(amount)} ({pct}%)</div>
                      </div>
                    )
                  })
                }
              </div>
            </Section>

            <Section title="Traffic sources">
              <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                {topSources.length === 0
                  ? <p style={{ color: '#AEAEB2', fontSize: 14, margin: 0 }}>No source data yet — sources captured when users enter email</p>
                  : topSources.map(([src, count]) => {
                    const pct = leads.total > 0 ? Math.round((count / leads.total) * 100) : 0
                    return (
                      <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 110, fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>{src}</div>
                        <div style={{ flex: 1, height: 8, background: '#F2F2F7', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#30D158', borderRadius: 4, width: `${pct}%` }} />
                        </div>
                        <div style={{ width: 80, fontSize: 13, color: '#6E6E73', textAlign: 'right' }}>{count} leads ({pct}%)</div>
                      </div>
                    )
                  })
                }
              </div>
            </Section>
          </>
        )}

        {/* Orders */}
        {tab === 'orders' && (
          <Section title={`Orders — ${orders.total || 0} total`}>
            <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,.08)' }}>
                    {['Site', 'Customer', 'Plan', 'Amount', 'Express', 'Status', 'Deployed'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6E6E73', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(orders.recent || []).map((o: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid rgba(0,0,0,.04)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 14, color: '#1D1D1F', fontWeight: 500 }}>
                        {o.liveUrl ? <a href={o.liveUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0066CC', textDecoration: 'none' }}>{o.productName || '—'} ↗</a> : (o.productName || '—')}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6E6E73' }}>{o.email || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: '#F2F2F7', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600, color: '#1D1D1F', textTransform: 'capitalize' }}>{o.plan || '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#30D158' }}>{o.amount ? fmt$(o.amount) : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{o.express ? '⚡ Yes' : '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: o.status === 'deployed' ? '#E8F8EF' : o.status === 'deploy_failed' ? '#FFF2F2' : '#F2F2F7', color: o.status === 'deployed' ? '#30D158' : o.status === 'deploy_failed' ? '#FF3B30' : '#6E6E73', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>
                          {o.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6E6E73' }}>{fmtDate(o.deployedAt)}</td>
                    </tr>
                  ))}
                  {!orders.recent?.length && (
                    <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#AEAEB2', fontSize: 14 }}>No orders yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Leads */}
        {tab === 'leads' && (
          <>
            <Section title={`Leads — ${leads.total || 0} captured`}>
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,.08)' }}>
                      {['Email', 'Source', 'Generates', 'Captured'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6E6E73', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(leads.recent || []).map((l: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid rgba(0,0,0,.04)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#1D1D1F', fontWeight: 500 }}>{l.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: '#F2F2F7', borderRadius: 6, padding: '3px 8px', fontSize: 12, fontWeight: 600, color: '#1D1D1F' }}>{l.source || 'direct'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 14, color: '#6E6E73' }}>{l.generates || 1}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6E6E73' }}>{fmtDate(l.capturedAt)}</td>
                      </tr>
                    ))}
                    {!leads.recent?.length && (
                      <tr><td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: '#AEAEB2', fontSize: 14 }}>No leads yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        )}

        {/* Resellers */}
        {tab === 'resellers' && (
          <Section title="Resellers">
            {resellers.length === 0
              ? <div style={{ background: '#fff', borderRadius: 14, padding: 24, textAlign: 'center' }}>
                  <p style={{ color: '#AEAEB2', fontSize: 14, margin: '0 0 12px' }}>No resellers set up yet.</p>
                  <code style={{ fontSize: 12, color: '#6E6E73' }}>ADMIN_SECRET=xxx node scripts/setup-resellers.js</code>
                </div>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {resellers.map((r: any) => (
                    <div key={r.code} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <p style={{ fontSize: 16, fontWeight: 700, color: '#1D1D1F', margin: '0 0 2px' }}>{r.name}</p>
                          <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>{r.email}</p>
                        </div>
                        <span style={{ background: '#F2F2F7', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#1D1D1F', alignSelf: 'flex-start' }}>{r.code}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <div style={{ background: '#F2F2F7', borderRadius: 8, padding: '10px 12px' }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', margin: '0 0 2px' }}>{r.sales}</p>
                          <p style={{ fontSize: 11, color: '#6E6E73', margin: 0 }}>Sales</p>
                        </div>
                        <div style={{ background: '#F2F2F7', borderRadius: 8, padding: '10px 12px' }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: '#30D158', margin: '0 0 2px' }}>${r.revenue?.toFixed(0) || 0}</p>
                          <p style={{ fontSize: 11, color: '#6E6E73', margin: 0 }}>Revenue</p>
                        </div>
                        <div style={{ background: '#F2F2F7', borderRadius: 8, padding: '10px 12px' }}>
                          <p style={{ fontSize: 18, fontWeight: 700, color: '#0066CC', margin: '0 0 2px' }}>${r.commission?.toFixed(0) || 0}</p>
                          <p style={{ fontSize: 11, color: '#6E6E73', margin: 0 }}>Owed</p>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: '#AEAEB2' }}>
                        Products: {(r.products || []).join(', ')} · {Math.round((r.commissionRate || 0) * 100)}% commission
                      </div>
                    </div>
                  ))}
                </div>
            }
          </Section>
        )}

        {/* Costs */}
        {tab === 'costs' && (
          <>
            <Section title="Cost breakdown">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <StatCard label="AI cost (est.)" value={`$${costs.breakdown?.ai || '0.00'}`} sub={`$${costs.aiPerBrief}/brief × ${leads.total + orders.total || 0} briefs`} />
                <StatCard label="Infrastructure (est.)" value={`$${costs.breakdown?.infra || 20}/mo`} sub="Vercel + Upstash Redis" />
              </div>
              <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: '0 0 12px' }}>Improving your margins</p>
                {[
                  { tip: 'Add Stripe keys to start capturing real revenue data', action: 'Set STRIPE_SECRET_KEY in Vercel env vars' },
                  { tip: 'Run the Stripe catalog script to create all 10 products', action: 'node scripts/stripe-catalog.js' },
                  { tip: 'Activate resellers to drive commission-based growth', action: 'node scripts/setup-resellers.js' },
                  { tip: 'Enable Paystack for African market (lower processing fees)', action: 'Set PAYSTACK_SECRET_KEY' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i < 3 ? 14 : 0, alignItems: 'flex-start' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6E6E73', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div>
                      <p style={{ fontSize: 14, color: '#1D1D1F', margin: '0 0 2px' }}>{item.tip}</p>
                      <code style={{ fontSize: 12, color: '#0066CC' }}>{item.action}</code>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
