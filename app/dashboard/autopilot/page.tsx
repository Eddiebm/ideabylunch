'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { AutopilotWorkspace, MarketplaceMetrics } from '@/app/lib/autopilot'
import styles from './page.module.css'
import execution from './execution.module.css'

type Stage = { label: string; key: string; score: number }

export default function AutopilotPage() {
  const [workspace, setWorkspace] = useState<AutopilotWorkspace | null>(null)
  const [stage, setStage] = useState<Stage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [executeTaskId, setExecuteTaskId] = useState('')
  const [form, setForm] = useState({ marketplaceName: '', niche: '', location: '', sellerProfile: '', buyerProfile: '', firstTransactionGoalDays: 30, dailyAdBudget: 0, maxCampaignSpend: 0, dailyDigest: true })
  const [metrics, setMetrics] = useState<MarketplaceMetrics>({ sellers: 0, listings: 0, buyers: 0, leads: 0, transactions: 0 })
  const [controls, setControls] = useState({ dailyAdBudget: 0, maxCampaignSpend: 0 })
  const [emailForm, setEmailForm] = useState({ recipients: '', subject: '', message: '', senderName: '', postalAddress: '', lawfulBasisConfirmed: false })
  const [metaForm, setMetaForm] = useState({ websiteUrl: '', headline: '', message: '', country: 'US', dailyBudget: 5, totalBudget: 35, durationDays: 7, spendConfirmed: false })

  useEffect(() => {
    fetch('/api/autopilot').then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load Autopilot')
      setWorkspace(data.workspace)
      setStage(data.stage)
      if (data.workspace) {
        setMetrics(data.workspace.metrics)
        setControls({ dailyAdBudget: data.workspace.dailyAdBudget || 0, maxCampaignSpend: data.workspace.maxCampaignSpend || 0 })
      }
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
      setControls({ dailyAdBudget: data.workspace.dailyAdBudget || 0, maxCampaignSpend: data.workspace.maxCampaignSpend || 0 })
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

  function openExecution(task: AutopilotWorkspace['tasks'][number]) {
    setExecuteTaskId(task.id)
    setEmailForm(current => ({ ...current, subject: task.title, message: task.asset || '', senderName: workspace?.marketplaceName || '' }))
    setMetaForm(current => ({ ...current, headline: task.title, message: task.asset || '', dailyBudget: Math.min(5, workspace?.dailyAdBudget || 5), totalBudget: Math.min(35, workspace?.maxCampaignSpend || 35) }))
  }

  function sendEmails(taskId: string) {
    const recipients = emailForm.recipients.split('\n').map(line => {
      const match = line.trim().match(/^(.*?)\s*<([^>]+)>$/)
      return match ? { name: match[1].trim(), email: match[2].trim() } : { email: line.trim() }
    }).filter(recipient => recipient.email)
    act('execute_email', { taskId, ...emailForm, recipients })
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
            <label>Maximum daily ad budget<input type="number" min="0" max="500" value={form.dailyAdBudget} onChange={e => setForm({ ...form, dailyAdBudget: Number(e.target.value) })} /></label>
            <label className={styles.check}><input type="checkbox" checked={form.dailyDigest} onChange={e => setForm({ ...form, dailyDigest: e.target.checked })} /> Email me the daily plan</label>
          </div>
          <label>Maximum total spend per Meta campaign<input type="number" min="0" max="5000" value={form.maxCampaignSpend} onChange={e => setForm({ ...form, maxCampaignSpend: Number(e.target.value) })} /><small>Set both advertising limits to $0 to disable paid campaigns.</small></label>
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
                  {task.status === 'awaiting_approval' ? <><button className={styles.primarySmall} onClick={() => act('approve', { taskId: task.id })} disabled={Boolean(busy)}>{busy === `approve:${task.id}` ? 'Preparing…' : 'Approve & prepare'}</button><button className={styles.textButton} onClick={() => act('reject', { taskId: task.id })}>Skip</button></> : <><button className={styles.primarySmall} onClick={() => openExecution(task)}>Send or launch</button><button className={styles.textButton} onClick={() => act('complete', { taskId: task.id })}>Mark completed manually</button><button className={styles.textButton} onClick={() => navigator.clipboard.writeText(task.asset || '')}>Copy</button></>}
                </div>
                {task.status === 'ready' && executeTaskId === task.id && (
                  <div className={execution.executePanel}>
                    <div className={styles.executeHead}><div><p className={styles.eyebrow}>EXECUTE APPROVED ACTION</p><h3>Choose exactly what happens</h3></div><button className={styles.textButton} onClick={() => setExecuteTaskId('')}>Close</button></div>
                    <div className={execution.executionGrid}>
                      <div className={execution.executionOption}>
                        <h4>Send individual emails</h4><p>Limited to 25 verified recipients per approval.</p>
                        <label>Recipients, one per line<textarea value={emailForm.recipients} onChange={e => setEmailForm({ ...emailForm, recipients: e.target.value })} placeholder={'Jane <jane@example.com>\nteam@example.com'} /></label>
                        <label>Subject<input value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} /></label>
                        <label>Message<textarea rows={7} value={emailForm.message} onChange={e => setEmailForm({ ...emailForm, message: e.target.value })} /></label>
                        <label>Sender name<input value={emailForm.senderName} onChange={e => setEmailForm({ ...emailForm, senderName: e.target.value })} /></label>
                        <label>Business postal address<input value={emailForm.postalAddress} onChange={e => setEmailForm({ ...emailForm, postalAddress: e.target.value })} placeholder="Required in marketing messages" /></label>
                        <label className={execution.consent}><input type="checkbox" checked={emailForm.lawfulBasisConfirmed} onChange={e => setEmailForm({ ...emailForm, lawfulBasisConfirmed: e.target.checked })} /> I confirm I have permission or another lawful basis to contact every recipient.</label>
                        <button className={execution.dangerAction} disabled={Boolean(busy) || !emailForm.lawfulBasisConfirmed} onClick={() => sendEmails(task.id)}>{busy === `execute_email:${task.id}` ? 'Sending…' : 'Send these emails now'}</button>
                      </div>
                      {task.type === 'buyer_acquisition' && <div className={execution.executionOption}>
                        <h4>Launch a Meta traffic campaign</h4><p>Campaign, ad set, creative, and ad are created only after this confirmation.</p>
                        <label>Destination URL<input value={metaForm.websiteUrl} onChange={e => setMetaForm({ ...metaForm, websiteUrl: e.target.value })} placeholder="https://yourmarketplace.com" /></label>
                        <label>Headline<input value={metaForm.headline} onChange={e => setMetaForm({ ...metaForm, headline: e.target.value })} /></label>
                        <label>Ad message<textarea rows={6} value={metaForm.message} onChange={e => setMetaForm({ ...metaForm, message: e.target.value })} /></label>
                        <div className={styles.split}><label>Country code<input maxLength={2} value={metaForm.country} onChange={e => setMetaForm({ ...metaForm, country: e.target.value.toUpperCase() })} /></label><label>Days<input type="number" min="1" max="30" value={metaForm.durationDays} onChange={e => setMetaForm({ ...metaForm, durationDays: Number(e.target.value) })} /></label></div>
                        <div className={styles.split}><label>Daily budget ($)<input type="number" min="1" max={workspace.dailyAdBudget} value={metaForm.dailyBudget} onChange={e => setMetaForm({ ...metaForm, dailyBudget: Number(e.target.value) })} /></label><label>Total cap ($)<input type="number" min="1" max={workspace.maxCampaignSpend} value={metaForm.totalBudget} onChange={e => setMetaForm({ ...metaForm, totalBudget: Number(e.target.value) })} /></label></div>
                        <p className={execution.notice}>Workspace limits: ${workspace.dailyAdBudget || 0}/day and ${workspace.maxCampaignSpend || 0} total. Meta may spend up to 25% above a daily budget on an opportunity day, but it will not exceed the campaign’s total cap.</p>
                        <label className={execution.consent}><input type="checkbox" checked={metaForm.spendConfirmed} onChange={e => setMetaForm({ ...metaForm, spendConfirmed: e.target.checked })} /> I authorize this exact campaign and a maximum total charge of ${metaForm.totalBudget}.</label>
                        <button className={execution.dangerAction} disabled={Boolean(busy) || !metaForm.spendConfirmed || !workspace.dailyAdBudget} onClick={() => act('execute_meta', { taskId: task.id, ...metaForm })}>{busy === `execute_meta:${task.id}` ? 'Launching…' : `Launch campaign — max $${metaForm.totalBudget}`}</button>
                      </div>}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>

          <aside>
            <section className={styles.sideCard}>
              <p className={styles.eyebrow}>SPEND CONTROLS</p><h2>Advertising limits</h2><p>Paid campaigns remain disabled at $0. Each launch still requires separate confirmation.</p>
              <div className={styles.metricInputs}><label>Daily budget ($)<input type="number" min="0" max="500" value={controls.dailyAdBudget} onChange={e => setControls({ ...controls, dailyAdBudget: Number(e.target.value) })} /></label><label>Total campaign cap ($)<input type="number" min="0" max="5000" value={controls.maxCampaignSpend} onChange={e => setControls({ ...controls, maxCampaignSpend: Number(e.target.value) })} /></label></div>
              <button className={styles.primarySmall} onClick={() => act('update_controls', controls)} disabled={Boolean(busy)}>Save spend controls</button>
            </section>
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
