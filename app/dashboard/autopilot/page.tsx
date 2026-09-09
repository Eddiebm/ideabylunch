'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { AutopilotWorkspace, MarketplaceMetrics } from '@/app/lib/autopilot'
import styles from './page.module.css'

type Stage = { label: string; key: string; score: number }

export default function AutopilotPage() {
  const [workspace, setWorkspace] = useState<AutopilotWorkspace | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ marketplaceName: '', niche: '', location: '', sellerProfile: '', buyerProfile: '', firstTransactionGoalDays: 30, dailyAdBudget: 0, dailyDigest: true })
  const [metrics, setMetrics] = useState<MarketplaceMetrics>({ sellers: 0, listings: 0, buyers: 0, leads: 0, transactions: 0 })

  useEffect(() => {
    fetch('/api/autopilot').then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load Autopilot')
      setWorkspace(data.workspace)
      setStage(data.stage)
      if (data.workspace) setMetrics(data.workspace.metrics)
    }).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])

  async function act(action: string, payload: Record<string, unknown> = {}) {
    setBusy(`${action}:${payload.taskId || ''}`)
    setError('')
    try {
      const response = await fetch('/api/autopilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Action failed')
      setWorkspace(data.workspace)
      setStage(data.stage)
      setMetrics(data.workspace.metrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy('')
    }
  }

  function setup(event: FormEvent) {
    event.preventDefault()
    act('setup', form)
  }

  if (loading) return <main className={styles.center}><p>Loading First Transaction Autopilot…</p></main>

  if (!workspace) return (
    <main className={styles.setupPage}>
      <a className={styles.back} href="/dashboard">← Dashboard</a>
      <section className={styles.setupCard}>
        <p className={styles.eyebrow}>FIRST TRANSACTION AUTOPILOT</p>
        <h1>Give the system one measurable job.</h1>
        <p className={styles.lede}>Autopilot watches marketplace supply and demand, identifies the bottleneck, and prepares the next growth action. Nothing is sent and no money is spent without your approval.</p>
        <form onSubmit={setup} className={styles.form}>
          <label>Marketplace name<input required value={form.marketplaceName} onChange={e => setForm({ ...form, marketplaceName: e.target.value })} placeholder="TradeSafe Africa" /></label>
          <label>Marketplace niche<input required value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} placeholder="Verified African importers and exporters" /></label>
          <div className={styles.split}>
            <label>Primary location<input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Ghana" /></label>
            <label>Goal window<select value={form.firstTransactionGoalDays} onChange={e => setForm({ ...form, firstTransactionGoalDays: Number(e.target.value) })}><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option></select></label>
          </div>
          <label>Ideal founding seller<textarea value={form.sellerProfile} onChange={e => setForm({ ...form, sellerProfile: e.target.value })} placeholder="Who supplies the marketplace? Be specific." /></label>
          <label>Ideal first buyer<textarea value={form.buyerProfile} onChange={e => setForm({ ...form, buyerProfile: e.target.value })} placeholder="Who urgently needs what sellers provide?" /></label>
          <div className={styles.split}>
            <label>Maximum daily ad spend<input type="number" min="0" max="500" value={form.dailyAdBudget} onChange={e => setForm({ ...form, dailyAdBudget: Number(e.target.value) })} /></label>
            <label className={styles.check}><input type="checkbox" checked={form.dailyDigest} onChange={e => setForm({ ...form, dailyDigest: e.target.checked })} /> Email me the daily plan</label>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.primary} disabled={Boolean(busy)}>Start Autopilot</button>
        </form>
      </section>
    </main>
  )

  const activeTasks = workspace.tasks.filter(task => task.status === 'awaiting_approval' || task.status === 'ready')
  const metricLabels: Record<keyof MarketplaceMetrics, string> = { sellers: 'Sellers', listings: 'Listings', buyers: 'Buyers', leads: 'Inquiries', transactions: 'Transactions' }

  return (
    <main className={styles.page}>
      <nav className={styles.nav}><a href="/dashboard">IdeaByLunch</a><span>First Transaction Autopilot</span></nav>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>{workspace.status.toUpperCase()} · {workspace.marketplaceName}</p><h1>{stage?.label}</h1><p>The system is optimizing for one verified transaction—not impressions or busywork.</p></div>
          <button className={styles.secondary} onClick={() => act(workspace.status === 'active' ? 'pause' : 'resume')} disabled={Boolean(busy)}>{workspace.status === 'active' ? 'Pause autopilot' : 'Resume autopilot'}</button>
        </header>

        <section className={styles.progressCard}>
          <div className={styles.progressTop}><span>Path to first transaction</span><strong>{stage?.score || 0}%</strong></div>
          <div className={styles.track}><div style={{ width: `${stage?.score || 0}%` }} /></div>
          <div className={styles.metrics}>
            {(Object.keys(metricLabels) as Array<keyof MarketplaceMetrics>).map(key => <div key={key}><strong>{workspace.metrics[key]}</strong><span>{metricLabels[key]}</span></div>)}
          </div>
        </section>

        <div className={styles.columns}>
          <section>
            <div className={styles.sectionHead}><div><p className={styles.eyebrow}>APPROVAL QUEUE</p><h2>Next best actions</h2></div><button className={styles.secondary} onClick={() => act('run_cycle')} disabled={Boolean(busy) || workspace.status === 'paused'}>{busy.startsWith('run_cycle') ? 'Running…' : 'Run cycle now'}</button></div>
            {activeTasks.length === 0 ? <div className={styles.empty}>No open tasks. Run a cycle after updating the funnel.</div> : activeTasks.map(task => (
              <article className={styles.task} key={task.id}>
                <div className={styles.taskMeta}><span>{task.channel}</span><span>{task.status === 'ready' ? 'Ready to use' : 'Needs approval'}</span></div>
                <h3>{task.title}</h3><p>{task.rationale}</p>
                {task.asset && <pre>{task.asset}</pre>}
                <div className={styles.actions}>
                  {task.status === 'awaiting_approval' ? <><button className={styles.primarySmall} onClick={() => act('approve', { taskId: task.id })} disabled={Boolean(busy)}>{busy === `approve:${task.id}` ? 'Preparing…' : 'Approve & prepare'}</button><button className={styles.textButton} onClick={() => act('reject', { taskId: task.id })}>Skip</button></> : <><button className={styles.primarySmall} onClick={() => act('complete', { taskId: task.id })}>Mark completed</button><button className={styles.textButton} onClick={() => navigator.clipboard.writeText(task.asset || '')}>Copy asset</button></>}
                </div>
              </article>
            ))}
          </section>

          <aside>
            <section className={styles.sideCard}>
              <p className={styles.eyebrow}>FUNNEL CHECK-IN</p><h2>Use verified numbers</h2><p>Autopilot never invents results. Update these counts from your marketplace analytics.</p>
              <div className={styles.metricInputs}>{(Object.keys(metricLabels) as Array<keyof MarketplaceMetrics>).map(key => <label key={key}>{metricLabels[key]}<input type="number" min="0" value={metrics[key]} onChange={e => setMetrics({ ...metrics, [key]: Number(e.target.value) })} /></label>)}</div>
              <button className={styles.primarySmall} onClick={() => act('update_metrics', { metrics })} disabled={Boolean(busy)}>Save metrics</button>
            </section>
            <section className={styles.sideCard}>
              <p className={styles.eyebrow}>ACTIVITY</p><h2>What the agent did</h2>
              <div className={styles.activity}>{workspace.activity.slice(0, 8).map(item => <div key={item.id}><span>{new Date(item.timestamp).toLocaleDateString()}</span><p>{item.message}</p></div>)}</div>
            </section>
          </aside>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </main>
  )
}
