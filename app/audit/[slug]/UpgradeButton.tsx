'use client'
import { useState } from 'react'

export default function UpgradeButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function go() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/audit/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Checkout failed')
        setLoading(false)
      }
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <button
        onClick={go}
        disabled={loading}
        style={{
          background: loading ? '#AEAEB2' : '#FF3B30',
          color: '#FFFFFF',
          borderRadius: 12,
          padding: '14px 32px',
          fontSize: 16,
          fontWeight: 600,
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 24px rgba(255,59,48,.4)',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Opening checkout…' : 'Ship the rewrite — $49 →'}
      </button>
      {error && <span style={{ fontSize: 13, color: '#FF3B30' }}>{error}</span>}
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Ready-to-paste Next.js code · 90-day access · No subscription</span>
    </div>
  )
}
