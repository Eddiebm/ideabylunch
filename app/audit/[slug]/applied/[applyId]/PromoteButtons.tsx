'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PromoteButtons({ applyId, productionUrl }: { applyId: string; productionUrl: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'promote' | 'rollback' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'shipped' | 'rolled_back' | null>(null)

  async function act(action: 'promote' | 'rollback') {
    setLoading(action)
    setError(null)
    try {
      const res = await fetch('/api/audit/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applyId, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setDone(data.status)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(null)
    }
  }

  if (done === 'shipped') {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: '#30D158', fontWeight: 600, margin: '0 0 12px' }}>✓ Shipped to production</p>
        <a href={productionUrl} target="_blank" rel="noreferrer" style={{ color: '#0066CC', fontSize: 14, fontWeight: 500 }}>View your live site →</a>
      </div>
    )
  }
  if (done === 'rolled_back') {
    return <p style={{ fontSize: 15, color: '#6E6E73', textAlign: 'center' }}>Rolled back — your live site was not changed.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => act('promote')}
          disabled={loading !== null}
          style={{ background: loading ? '#AEAEB2' : '#30D158', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 600, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {loading === 'promote' ? 'Shipping…' : 'Ship to production →'}
        </button>
        <button
          onClick={() => act('rollback')}
          disabled={loading !== null}
          style={{ background: 'transparent', color: '#6E6E73', border: '0.5px solid rgba(0,0,0,.15)', borderRadius: 12, padding: '14px 24px', fontSize: 15, fontWeight: 500, cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}
        >
          {loading === 'rollback' ? 'Rolling back…' : 'Roll back'}
        </button>
      </div>
      {error && <span style={{ fontSize: 13, color: '#FF3B30' }}>{error}</span>}
    </div>
  )
}
