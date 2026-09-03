'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ApplyRewriteButton({ slug, siteId }: { slug: string; siteId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)

  async function go() {
    setLoading(true)
    setError(null)
    setNeedsLogin(false)
    try {
      const res = await fetch('/api/audit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, siteId }),
      })
      const data = await res.json()
      if (res.status === 401) { setNeedsLogin(true); setLoading(false); return }
      if (!res.ok) { setError(data.detail || data.error || 'Could not apply this rewrite'); setLoading(false); return }
      router.push(`/audit/${slug}/applied/${data.applyId}`)
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  if (needsLogin) {
    return (
      <a href="/login" style={{ background: '#30D158', color: '#FFFFFF', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 600, display: 'inline-block', boxShadow: '0 4px 24px rgba(48,209,88,.4)' }}>
        Log in to apply this rewrite →
      </a>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <button
        onClick={go}
        disabled={loading}
        style={{
          background: loading ? '#AEAEB2' : '#30D158',
          color: '#FFFFFF',
          borderRadius: 12,
          padding: '14px 32px',
          fontSize: 16,
          fontWeight: 600,
          border: 'none',
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: loading ? 'none' : '0 4px 24px rgba(48,209,88,.4)',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Building preview…' : 'Apply this rewrite to my live site →'}
      </button>
      {error && <span style={{ fontSize: 13, color: '#FF3B30' }}>{error}</span>}
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Ships to a preview first — you confirm before it goes live</span>
    </div>
  )
}
