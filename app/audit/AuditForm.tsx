'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function AuditForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<string>('')
  const router = useRouter()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    setStage('Fetching your site...')

    try {
      // Show progressive stages while the request runs
      const stageTimer = setTimeout(() => setStage('Reading your hero, your CTAs, your pricing...'), 2500)
      const stageTimer2 = setTimeout(() => setStage('Running the 10-point audit...'), 6000)
      const stageTimer3 = setTimeout(() => setStage('Rewriting your homepage...'), 12000)

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      clearTimeout(stageTimer)
      clearTimeout(stageTimer2)
      clearTimeout(stageTimer3)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.error === 'rate_limited') {
          setError(`You hit the free limit (${data.limit}/day). Come back tomorrow or upgrade.`)
        } else if (data.error === 'invalid_url') {
          setError('That URL doesn\'t look right. Try something like example.com.')
        } else if (data.error === 'fetch_failed' || data.error === 'fetch_error') {
          setError('Couldn\'t reach that site. Is it up? Is it behind a login?')
        } else {
          setError('Audit failed. Try again in a moment.')
        }
        setLoading(false)
        return
      }

      const data = await res.json()
      router.push(`/audit/${data.slug}`)
    } catch {
      setError('Network error. Try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          autoFocus
          style={{
            flex: '1 1 280px',
            padding: '14px 18px',
            fontSize: 16,
            border: '1px solid rgba(0,0,0,.12)',
            borderRadius: 12,
            outline: 'none',
            background: '#FFF',
            fontFamily: 'inherit',
            color: '#1D1D1F',
          }}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          style={{
            background: loading ? '#AEAEB2' : '#FF3B30',
            color: '#FFF',
            border: 'none',
            borderRadius: 12,
            padding: '14px 28px',
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: '-.2px',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(255,59,48,.3)',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Auditing...' : 'Audit my site →'}
        </button>
      </form>

      {loading && stage && (
        <p style={{ fontSize: 14, color: '#0066CC', margin: '14px 0 0', fontWeight: 500 }}>
          {stage}
        </p>
      )}

      {error && (
        <p style={{ fontSize: 14, color: '#FF3B30', margin: '14px 0 0', fontWeight: 500 }}>
          {error}
        </p>
      )}
    </div>
  )
}
