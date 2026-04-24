'use client'
import { useState } from 'react'

interface ContentData {
  heroTitle?: string
  heroDescription?: string
  heroImageUrl?: string
  ctaText?: string
}

interface Props {
  siteId: string
  token: string
  initialContent: ContentData
  editCount: number
  productName: string
}

export default function EditForm({ siteId, token, initialContent, editCount, productName }: Props) {
  const [heroTitle, setHeroTitle] = useState(initialContent.heroTitle || productName || '')
  const [heroDescription, setHeroDescription] = useState(initialContent.heroDescription || '')
  const [heroImageUrl, setHeroImageUrl] = useState(initialContent.heroImageUrl || '')
  const [ctaText, setCtaText] = useState(initialContent.ctaText || 'Get started')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')

  const editsRemaining = Math.max(0, 3 - editCount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setPaymentUrl('')
    setLoading(true)

    try {
      const res = await fetch(`/api/dashboard/${siteId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          heroTitle,
          heroDescription,
          heroImageUrl,
          ctaText,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.needsPayment) {
          // Show payment modal
          setPaymentUrl(data.paymentUrl)
          return
        }
        setError(data.error || 'Update failed')
        return
      }

      setMessage(`✓ Site updated live in ${data.liveUrl}`)
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (e: any) {
      setError(e.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  if (paymentUrl) {
    return (
      <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1D1D1F', marginBottom: 16 }}>
          Unlock unlimited edits
        </h2>
        <p style={{ fontSize: 15, color: '#6E6E73', marginBottom: 24 }}>
          You've used all 3 free edits. Pay $7.99 to continue editing your site.
        </p>
        <a
          href={paymentUrl}
          style={{
            background: '#0066CC',
            color: '#FFFFFF',
            borderRadius: 10,
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Pay $7.99 to edit
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#FFFFFF', borderRadius: 16, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6E6E73', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Hero Title
        </label>
        <input
          type="text"
          value={heroTitle}
          onChange={(e) => setHeroTitle(e.target.value)}
          placeholder="e.g. Mike's Professional Plumbing"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 15,
            border: '0.5px solid rgba(0,0,0,.12)',
            borderRadius: 8,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6E6E73', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Hero Description
        </label>
        <textarea
          value={heroDescription}
          onChange={(e) => setHeroDescription(e.target.value)}
          placeholder="Describe your business in 1-2 sentences"
          rows={3}
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 15,
            border: '0.5px solid rgba(0,0,0,.12)',
            borderRadius: 8,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6E6E73', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          Hero Image URL
        </label>
        <input
          type="url"
          value={heroImageUrl}
          onChange={(e) => setHeroImageUrl(e.target.value)}
          placeholder="https://unsplash.com/..."
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 15,
            border: '0.5px solid rgba(0,0,0,.12)',
            borderRadius: 8,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6E6E73', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          CTA Button Text
        </label>
        <input
          type="text"
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          placeholder="e.g. Call for free quote"
          style={{
            width: '100%',
            padding: '12px 16px',
            fontSize: 15,
            border: '0.5px solid rgba(0,0,0,.12)',
            borderRadius: 8,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error && (
        <div style={{ background: '#FFE5E5', color: '#D70015', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}
        </div>
      )}
      {message && (
        <div style={{ background: '#E5F5FF', color: '#0066CC', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          background: loading ? '#AEAEB2' : '#1D1D1F',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 15,
          fontWeight: 600,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Saving...' : editsRemaining > 0 ? `Save changes (${editsRemaining} free left)` : 'Pay $7.99 to save'}
      </button>
    </form>
  )
}
