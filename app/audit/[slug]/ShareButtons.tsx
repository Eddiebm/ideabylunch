'use client'
import { useState } from 'react'

interface Props {
  domain: string
  score: number
  topFix: string
  slug: string
}

export default function ShareButtons({ domain, score, topFix, slug }: Props) {
  const [copied, setCopied] = useState(false)
  const url = `https://ideabylunch.com/audit/${slug}`

  const xCaption = `Just ran ${domain} through an AI audit — ${score}/100 conviction.\n\nTop fix: ${topFix.slice(0, 140)}${topFix.length > 140 ? '…' : ''}\n\nFree audit on any site:`
  const liCaption = `I audited ${domain} with an AI tool I built and got ${score}/100 conviction.\n\nThe top fix it surfaced: ${topFix}\n\nThe interesting part — it caught real positioning issues, not just SEO basics. Free for any site:`

  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(xCaption)}&url=${encodeURIComponent(url)}`
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(liCaption)}`

  function copy() {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const baseBtn = {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    padding: '10px 16px',
    borderRadius: 10,
    border: '0.5px solid rgba(0,0,0,.12)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    textDecoration: 'none',
  } as const

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#6E6E73', letterSpacing: '.04em', textTransform: 'uppercase', marginRight: 4 }}>Share this audit</span>
      <a href={xUrl} target="_blank" rel="noreferrer noopener" style={{ ...baseBtn, background: '#0F1419', color: '#FFFFFF', borderColor: '#0F1419' }}>
        <span style={{ fontWeight: 700 }}>𝕏</span> Post on X
      </a>
      <a href={liUrl} target="_blank" rel="noreferrer noopener" style={{ ...baseBtn, background: '#0A66C2', color: '#FFFFFF', borderColor: '#0A66C2' }}>
        <span style={{ fontWeight: 700 }}>in</span> LinkedIn
      </a>
      <button onClick={copy} style={{ ...baseBtn, background: copied ? '#30D158' : '#FFFFFF', color: copied ? '#FFFFFF' : '#1D1D1F', borderColor: copied ? '#30D158' : 'rgba(0,0,0,.12)' }}>
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
    </div>
  )
}
