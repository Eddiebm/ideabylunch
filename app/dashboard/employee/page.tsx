'use client'

import { FormEvent, useEffect, useState } from 'react'
import type { EmployeeItem, EmployeeSkillType, EmployeeWorkspace } from '@/app/lib/employee'
import { SKILL_LABELS } from '@/app/lib/employee'
import styles from './page.module.css'

const SKILL_KEYS = Object.keys(SKILL_LABELS) as EmployeeSkillType[]

export default function EmployeePage() {
  const [workspace, setWorkspace] = useState<EmployeeWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [setupForm, setSetupForm] = useState({ businessName: '', businessType: '', skills: ['lead_followup'] as EmployeeSkillType[] })
  const [addForm, setAddForm] = useState({ skill: 'lead_followup' as EmployeeSkillType, contactName: '', contactEmail: '', context: '' })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [sendPanel, setSendPanel] = useState('')
  const [sendForm, setSendForm] = useState({ senderName: '', postalAddress: '', lawfulBasisConfirmed: false })

  useEffect(() => {
    fetch('/api/employee').then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load your AI employee')
      setWorkspace(data.workspace)
    }).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])

  async function act(action: string, payload: Record<string, unknown> = {}) {
    setBusy(`${action}:${payload.itemId || ''}`)
    setError('')
    try {
      const response = await fetch('/api/employee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Action failed')
      setWorkspace(data.workspace)
      return data.workspace as EmployeeWorkspace
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
      return null
    } finally {
      setBusy('')
    }
  }

  function setup(event: FormEvent) {
    event.preventDefault()
    act('setup', setupForm)
  }

  async function addItem(event: FormEvent) {
    event.preventDefault()
    if (!addForm.context.trim()) return
    const result = await act('add_item', addForm)
    if (result) setAddForm({ ...addForm, contactName: '', contactEmail: '', context: '' })
  }

  function approve(item: EmployeeItem) {
    const edited = drafts[item.id]
    if (edited !== undefined && edited.trim() !== item.draft.trim()) act('rewrite', { itemId: item.id, draft: edited })
    else act('approve', { itemId: item.id })
  }

  function reject(item: EmployeeItem) {
    act('reject', { itemId: item.id, reason: reasons[item.id] || '' })
  }

  function openSend(item: EmployeeItem) {
    setSendPanel(item.id)
    setSendForm({ senderName: workspace?.businessName || '', postalAddress: '', lawfulBasisConfirmed: false })
  }

  if (loading) return <main className={styles.center}><p>Loading your AI employee…</p></main>

  if (!workspace) return (
    <main className={styles.setupPage}>
      <a className={styles.back} href="/dashboard">← Dashboard</a>
      <section className={styles.setupCard}>
        <p className={styles.eyebrow}>MANAGED AI EMPLOYEE</p>
        <h1>Hand off the four boring problems.</h1>
        <p className={styles.lede}>The agent drafts the reply, the follow-up, or the report. You click Approve, Rewrite, or Reject — nothing goes out on its own, and every decision teaches it your voice.</p>
        <form onSubmit={setup} className={styles.form}>
          <label>Business name<input required value={setupForm.businessName} onChange={e => setSetupForm({ ...setupForm, businessName: e.target.value })} placeholder="Riverside Dental" /></label>
          <label>What kind of business<input required value={setupForm.businessType} onChange={e => setSetupForm({ ...setupForm, businessType: e.target.value })} placeholder="Dental clinic" /></label>
          <div>
            <p style={{ fontSize: '.82rem', fontWeight: 700, color: '#4e5968', margin: '0 0 8px' }}>Which recurring jobs should it handle?</p>
            <div className={styles.checkGrid}>
              {SKILL_KEYS.map(skill => (
                <label key={skill} className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={setupForm.skills.includes(skill)}
                    onChange={e => setSetupForm({ ...setupForm, skills: e.target.checked ? [...setupForm.skills, skill] : setupForm.skills.filter(s => s !== skill) })}
                  />
                  <span>{SKILL_LABELS[skill].label}<small>{SKILL_LABELS[skill].blurb}</small></span>
                </label>
              ))}
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.primary} disabled={Boolean(busy)}>Hire the AI employee</button>
        </form>
      </section>
    </main>
  )

  const queue = workspace.items.filter(item => item.status === 'awaiting_approval')
  const approved = workspace.items.filter(item => item.status === 'approved')
  const done = workspace.items.filter(item => item.status === 'sent' || item.status === 'rejected')

  return (
    <main className={styles.page}>
      <nav className={styles.nav}><a href="/dashboard">IdeaByLunch</a><span>AI Employee</span></nav>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{workspace.status.toUpperCase()} · {workspace.businessName}</p>
            <h1>Approve, rewrite, or reject — that's the whole job.</h1>
            <p>Every decision below is logged and folded back into the next draft for this skill.</p>
          </div>
          <button className={styles.secondary} onClick={() => act(workspace.status === 'active' ? 'pause' : 'resume')} disabled={Boolean(busy)}>{workspace.status === 'active' ? 'Pause' : 'Resume'}</button>
        </header>

        <div className={styles.statsRow}>
          <div className={styles.statCard}><strong>{workspace.stats.approved}</strong><span>Approved</span></div>
          <div className={styles.statCard}><strong>{workspace.stats.rewritten}</strong><span>Approved with edits</span></div>
          <div className={styles.statCard}><strong>{workspace.stats.rejected}</strong><span>Rejected</span></div>
        </div>

        <div className={styles.columns}>
          <section>
            <div className={styles.addCard}>
              <p className={styles.eyebrow}>NEW ITEM</p>
              <form onSubmit={addItem} className={styles.form} style={{ marginTop: 10 }}>
                <div className={styles.split}>
                  <label>Skill<select value={addForm.skill} onChange={e => setAddForm({ ...addForm, skill: e.target.value as EmployeeSkillType })}>
                    {workspace.skills.map(skill => <option key={skill} value={skill}>{SKILL_LABELS[skill].label}</option>)}
                  </select></label>
                  <label>Contact name (optional)<input value={addForm.contactName} onChange={e => setAddForm({ ...addForm, contactName: e.target.value })} placeholder="Jane" /></label>
                </div>
                {SKILL_LABELS[addForm.skill].needsContact && <label>Contact email (needed to send)<input type="email" value={addForm.contactEmail} onChange={e => setAddForm({ ...addForm, contactEmail: e.target.value })} placeholder="jane@example.com" /></label>}
                <label>What needs a response?<textarea required value={addForm.context} onChange={e => setAddForm({ ...addForm, context: e.target.value })} placeholder="Inquired about pricing 3 days ago, no reply yet." /></label>
                <button className={styles.primarySmall} disabled={Boolean(busy) || workspace.status === 'paused'}>{busy === 'add_item:' ? 'Drafting…' : 'Draft it'}</button>
              </form>
            </div>

            <div className={styles.sectionHead}><div><p className={styles.eyebrow}>APPROVAL QUEUE</p><h2>Waiting on you</h2></div></div>
            {queue.length === 0 ? <div className={styles.empty}>Nothing waiting. Add an item above.</div> : queue.map(item => (
              <article className={styles.task} key={item.id}>
                <div className={styles.taskMeta}><span>{SKILL_LABELS[item.skill].label}</span><span>Needs a decision</span></div>
                <h3>{item.title}</h3>
                <p>{item.context}</p>
                <textarea className={styles.draft} value={drafts[item.id] ?? item.draft} onChange={e => setDrafts({ ...drafts, [item.id]: e.target.value })} />
                <div className={styles.actions}>
                  <button className={styles.primarySmall} onClick={() => approve(item)} disabled={Boolean(busy)}>{busy === `approve:${item.id}` || busy === `rewrite:${item.id}` ? 'Saving…' : (drafts[item.id] !== undefined && drafts[item.id].trim() !== item.draft.trim() ? 'Approve with edits' : 'Approve')}</button>
                  <input placeholder="Reason for rejecting (optional, teaches the agent)" value={reasons[item.id] || ''} onChange={e => setReasons({ ...reasons, [item.id]: e.target.value })} style={{ flex: 1, minWidth: 180, border: '1px solid #d8dee8', borderRadius: 10, padding: '8px 10px', font: 'inherit', fontSize: '.85rem' }} />
                  <button className={styles.dangerText} onClick={() => reject(item)} disabled={Boolean(busy)}>Reject</button>
                </div>
              </article>
            ))}

            <div className={styles.sectionHead} style={{ marginTop: 20 }}><div><p className={styles.eyebrow}>APPROVED</p><h2>Ready to go out</h2></div></div>
            {approved.length === 0 ? <div className={styles.empty}>Nothing approved yet.</div> : approved.map(item => (
              <article className={styles.task} key={item.id}>
                <div className={styles.taskMeta}><span>{SKILL_LABELS[item.skill].label}</span><span className={`${styles.statusBadge} ${styles.statusApproved}`}>Approved{item.wasRewritten ? ' · edited' : ''}</span></div>
                <h3>{item.title}</h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '.86rem', background: '#f9fafc', borderRadius: 10, padding: 14 }}>{item.draft}</pre>
                <div className={styles.actions}>
                  {item.contactEmail ? <button className={styles.primarySmall} onClick={() => openSend(item)}>Send</button> : <button className={styles.secondary} onClick={() => act('complete', { itemId: item.id })} disabled={Boolean(busy)}>Mark handled</button>}
                  <button className={styles.textButton} onClick={() => navigator.clipboard.writeText(item.draft)}>Copy</button>
                </div>
                {sendPanel === item.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e1e6ee' }}>
                    <label>Sender name<input value={sendForm.senderName} onChange={e => setSendForm({ ...sendForm, senderName: e.target.value })} style={{ width: '100%', marginBottom: 10 }} /></label>
                    <label>Business postal address<input value={sendForm.postalAddress} onChange={e => setSendForm({ ...sendForm, postalAddress: e.target.value })} placeholder="Required in marketing messages" style={{ width: '100%', marginBottom: 10 }} /></label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '.85rem', marginBottom: 10 }}><input type="checkbox" checked={sendForm.lawfulBasisConfirmed} onChange={e => setSendForm({ ...sendForm, lawfulBasisConfirmed: e.target.checked })} /> I confirm I have permission or another lawful basis to contact {item.contactEmail}.</label>
                    <button className={styles.primarySmall} disabled={Boolean(busy) || !sendForm.lawfulBasisConfirmed} onClick={() => act('send', { itemId: item.id, ...sendForm, message: item.draft })}>{busy === `send:${item.id}` ? 'Sending…' : 'Send now'}</button>
                  </div>
                )}
              </article>
            ))}
          </section>

          <aside>
            <section className={styles.sideCard}>
              <p className={styles.eyebrow}>SKILLS</p><h2>What it's allowed to touch</h2>
              <div className={styles.checkGrid} style={{ marginTop: 12 }}>
                {SKILL_KEYS.map(skill => (
                  <label key={skill} className={styles.checkRow}>
                    <input type="checkbox" checked={workspace.skills.includes(skill)} onChange={e => act('update_skills', { skills: e.target.checked ? [...workspace.skills, skill] : workspace.skills.filter(s => s !== skill) })} />
                    <span>{SKILL_LABELS[skill].label}</span>
                  </label>
                ))}
              </div>
            </section>
            <section className={styles.sideCard}>
              <p className={styles.eyebrow}>WHAT IT'S LEARNED</p><h2>Voice &amp; priorities</h2>
              <p>Every edit or rejection reason is folded into the next draft for that skill.</p>
              <div className={styles.voice}>
                {workspace.voiceNotes.length === 0 ? <p style={{ color: '#AEAEB2' }}>Nothing learned yet — approve, edit, or reject an item.</p> : workspace.voiceNotes.slice(0, 6).map(note => <div key={note.id}><span>{SKILL_LABELS[note.skill].label} · {note.kind === 'rewrite' ? 'edited to' : 'rejected because'}</span><p>{note.note}</p></div>)}
              </div>
            </section>
            <section className={styles.sideCard}>
              <p className={styles.eyebrow}>ACTIVITY</p><h2>Recent history</h2>
              <div className={styles.activity}>{workspace.activity.slice(0, 8).map(item => <div key={item.id}><span>{new Date(item.timestamp).toLocaleDateString()}</span><p>{item.message}</p></div>)}</div>
            </section>
            {done.length > 0 && <section className={styles.sideCard}>
              <p className={styles.eyebrow}>HISTORY</p><h2>{done.length} closed item{done.length === 1 ? '' : 's'}</h2>
              <div className={styles.activity}>{done.slice(0, 8).map(item => <div key={item.id}><span className={`${styles.statusBadge} ${item.status === 'sent' ? styles.statusSent : styles.statusRejected}`}>{item.status}</span><p>{item.title}</p></div>)}</div>
            </section>}
          </aside>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </main>
  )
}
