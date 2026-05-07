'use client'
import { useState } from 'react'

export default function EmpireAuditButton({ url }: { url: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.slug) {
        window.location.reload()
      } else if (data.error === 'rate_limited') {
        setError(`Rate limited (${data.limit}/day). Try tomorrow.`)
        setLoading(false)
      } else {
        setError(data.error || 'Audit failed')
        setLoading(false)
      }
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={go}
        disabled={loading}
        style={{
          background: loading ? '#AEAEB2' : '#0066CC',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          alignSelf: 'flex-start',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Auditing…' : 'Run audit now →'}
      </button>
      {error && <span style={{ fontSize: 12, color: '#FF3B30' }}>{error}</span>}
    </>
  )
}
