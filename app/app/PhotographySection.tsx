'use client'
import { useState, useEffect } from 'react'

interface Photo {
  id: string
  url: string
  thumb: string
  small: string
  full: string
  download: string
  photographer: string
  photographerUrl: string
  unsplashUrl: string
  alt: string
  color: string
}

interface ImagePrompt {
  use: string
  label: string
  prompt: string
}

interface PhotographyData {
  prompts: ImagePrompt[]
  photos: Record<string, Photo[]>
  loading: boolean
  error: string
}

const USE_COLORS: Record<string, string> = {
  hero: '#c8ff00',
  feature: '#60a5fa',
  human: '#f9a8d4',
  atmosphere: '#a78bfa',
  social: '#34d399'
}

function CopyBtn({ text, small }: { text: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      style={{
        background: copied ? 'rgba(74,222,128,.08)' : 'none',
        border: `1px solid ${copied ? '#4ade80' : 'rgba(168,192,255,.08)'}`,
        borderRadius: 3,
        padding: small ? '3px 8px' : '4px 12px',
        fontFamily: 'var(--mono)',
        fontSize: small ? 8 : 9,
        letterSpacing: '.1em',
        textTransform: 'uppercase' as const,
        color: copied ? '#4ade80' : '#4a6080',
        cursor: 'pointer',
        transition: 'all .15s',
        whiteSpace: 'nowrap' as const
      }}>
      {copied ? '✓' : 'Copy'}
    </button>
  )
}

export default function PhotographySection({
  brief,
  productName,
  industry,
  tagline,
  isDone
}: {
  brief: string
  productName: string
  industry?: string
  tagline?: string
  isDone: boolean
}) {
  const [data, setData] = useState<PhotographyData>({
    prompts: [],
    photos: {},
    loading: false,
    error: ''
  })
  const [activeTab, setActiveTab] = useState<'prompts' | 'photos'>('prompts')
  const [activePromptIdx, setActivePromptIdx] = useState(0)

  useEffect(() => {
    if (!isDone || !brief || data.prompts.length > 0) return
    generatePhotography()
  }, [isDone])

  async function generatePhotography() {
    setData(d => ({ ...d, loading: true, error: '' }))

    try {
      // Generate prompts
      const promptRes = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, productName, industry, tagline })
      })

      if (!promptRes.ok) throw new Error('Failed to generate prompts')
      const promptData = await promptRes.json()

      setData(d => ({ ...d, prompts: promptData.prompts || [] }))

      // Fetch photos for each query
      if (promptData.unsplashQueries) {
        const photoResults: Record<string, Photo[]> = {}
        
        await Promise.all(
          promptData.unsplashQueries.slice(0, 5).map(async (query: string, i: number) => {
            try {
              const use = promptData.prompts[i]?.use || `image${i}`
              const res = await fetch(`/api/photos?query=${encodeURIComponent(query)}&count=3&orientation=landscape`)
              if (res.ok) {
                const d = await res.json()
                photoResults[use] = d.photos || []
              }
            } catch {}
          })
        )

        setData(d => ({ ...d, photos: photoResults, loading: false }))
      } else {
        setData(d => ({ ...d, loading: false }))
      }
    } catch (err: any) {
      setData(d => ({ ...d, loading: false, error: err.message }))
    }
  }

  const activePrompt = data.prompts[activePromptIdx]
  const activePhotos = activePrompt ? (data.photos[activePrompt.use] || []) : []

  const css = `
    .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .photo-card { position: relative; border-radius: 4px; overflow: hidden; cursor: pointer; }
    .photo-card img { width: 100%; height: 120px; object-fit: cover; display: block; }
    .photo-card:hover .photo-overlay { opacity: 1; }
    .photo-overlay { position: absolute; inset: 0; background: rgba(10,14,26,.7); opacity: 0; transition: opacity .2s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .photo-credit { font-family: var(--mono); font-size: 9px; color: #4a6080; margin-top: 4px; }
    .prompt-tab { background: none; border: 1px solid rgba(168,192,255,.08); border-radius: 3px; padding: 5px 14px; font-family: var(--mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; cursor: pointer; transition: all .15s; }
    .prompt-tab.active { border-color: rgba(200,255,0,.3); color: #c8ff00; background: rgba(200,255,0,.06); }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .skeleton { background: linear-gradient(90deg, #1a2236 25%, #1e2840 50%, #1a2236 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 4px; }
  `

  if (!isDone) return null

  return (
    <>
      <style>{css}</style>
      <div style={{
        background: '#111829',
        border: '1px solid rgba(168,192,255,.08)',
        borderRadius: 5,
        overflow: 'hidden',
        borderLeft: '3px solid #c8ff00',
        marginTop: 3
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', background: '#1a2236',
          borderBottom: '1px solid rgba(168,192,255,.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 14 }}>📸</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#c8ff00', opacity: .9 }}>
              PHOTOGRAPHY DIRECTION
            </span>
            {data.loading && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#c8ff00', opacity: .6 }}>
                · generating…
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`prompt-tab ${activeTab === 'prompts' ? 'active' : ''}`}
              style={{ color: activeTab === 'prompts' ? '#c8ff00' : '#4a6080' }}>
              AI Prompts
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`prompt-tab ${activeTab === 'photos' ? 'active' : ''}`}
              style={{ color: activeTab === 'photos' ? '#c8ff00' : '#4a6080' }}>
              Free Photos
            </button>
          </div>
        </div>

        <div style={{ padding: '18px 20px' }}>
          {data.error && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: '#f87171', marginBottom: 16 }}>
              ⚠ {data.error}
            </div>
          )}

          {/* Prompt selector tabs */}
          {data.prompts.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
              {data.prompts.map((p, i) => {
                const col = USE_COLORS[p.use] || '#c8ff00'
                return (
                  <button
                    key={i}
                    onClick={() => setActivePromptIdx(i)}
                    style={{
                      background: activePromptIdx === i ? `${col}12` : 'none',
                      border: `1px solid ${activePromptIdx === i ? col + '55' : 'rgba(168,192,255,.08)'}`,
                      borderRadius: 3,
                      padding: '5px 12px',
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: activePromptIdx === i ? col : '#4a6080',
                      cursor: 'pointer',
                      transition: 'all .15s'
                    }}>
                    {p.use}
                  </button>
                )
              })}
            </div>
          )}

          {/* Loading skeletons */}
          {data.loading && data.prompts.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton" style={{ height: 18, width: '60%' }} />
              <div className="skeleton" style={{ height: 80, width: '100%' }} />
              <div className="skeleton" style={{ height: 18, width: '40%' }} />
            </div>
          )}

          {/* AI Prompts tab */}
          {activeTab === 'prompts' && activePrompt && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 10
              }}>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 10,
                  color: USE_COLORS[activePrompt.use] || '#c8ff00',
                  letterSpacing: '.1em', textTransform: 'uppercase'
                }}>
                  {activePrompt.label}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <CopyBtn text={activePrompt.prompt} />
                  <a
                    href={`https://www.midjourney.com/imagine?q=${encodeURIComponent(activePrompt.prompt)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'none',
                      border: '1px solid rgba(168,192,255,.08)',
                      borderRadius: 3,
                      padding: '4px 12px',
                      fontFamily: 'var(--mono)',
                      fontSize: 9,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                      color: '#4a6080',
                      textDecoration: 'none',
                      transition: 'all .15s'
                    }}>
                    Midjourney ↗
                  </a>
                </div>
              </div>

              {/* The prompt itself */}
              <div style={{
                background: '#0a0e1a',
                border: '1px solid rgba(168,192,255,.08)',
                borderRadius: 4,
                padding: '14px 16px',
                fontFamily: 'var(--body)',
                fontSize: 14,
                lineHeight: 1.8,
                color: '#8fa8cc',
                marginBottom: 16
              }}>
                {activePrompt.prompt}
              </div>

              {/* All prompts at a glance */}
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 9,
                letterSpacing: '.1em', textTransform: 'uppercase',
                color: '#4a6080', marginBottom: 10
              }}>
                All 5 prompts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.prompts.map((p, i) => {
                  const col = USE_COLORS[p.use] || '#c8ff00'
                  return (
                    <div
                      key={i}
                      onClick={() => setActivePromptIdx(i)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        background: activePromptIdx === i ? `${col}08` : '#1a2236',
                        border: `1px solid ${activePromptIdx === i ? col + '33' : 'rgba(168,192,255,.06)'}`,
                        borderRadius: 4,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        transition: 'all .15s'
                      }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 8,
                        color: col, letterSpacing: '.1em',
                        textTransform: 'uppercase', flexShrink: 0,
                        paddingTop: 2, minWidth: 70
                      }}>
                        {p.use}
                      </span>
                      <span style={{
                        fontFamily: 'var(--body)', fontSize: 12,
                        color: '#8fa8cc', lineHeight: 1.5,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const
                      }}>
                        {p.prompt.slice(0, 120)}…
                      </span>
                      <CopyBtn text={p.prompt} small />
                    </div>
                  )
                })}
              </div>

              {/* Usage note */}
              <div style={{
                marginTop: 16,
                padding: '10px 14px',
                background: 'rgba(200,255,0,.04)',
                border: '1px solid rgba(200,255,0,.12)',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: '#4a6080',
                lineHeight: 1.7
              }}>
                ✦ Paste any prompt into <strong style={{ color: '#c8ff00' }}>Midjourney</strong>, <strong style={{ color: '#60a5fa' }}>DALL-E 3</strong>, or <strong style={{ color: '#4ade80' }}>Flux</strong> to generate custom photorealistic images for this brief.
              </div>
            </div>
          )}

          {/* Free Photos tab */}
          {activeTab === 'photos' && (
            <div>
              {activePrompt && activePhotos.length > 0 ? (
                <>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 9,
                    letterSpacing: '.1em', textTransform: 'uppercase',
                    color: USE_COLORS[activePrompt.use] || '#c8ff00',
                    marginBottom: 12
                  }}>
                    {activePrompt.label} — Royalty-free options
                  </div>
                  <div className="photo-grid">
                    {activePhotos.map((photo) => (
                      <div key={photo.id} className="photo-card">
                        <img src={photo.small} alt={photo.alt} />
                        <div className="photo-overlay">
                          <a
                            href={photo.download + '?force=true'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: '#c8ff00', color: '#0a0e1a',
                              border: 'none', borderRadius: 3,
                              padding: '6px 12px',
                              fontFamily: 'var(--mono)', fontSize: 9,
                              fontWeight: 500, letterSpacing: '.1em',
                              textTransform: 'uppercase',
                              textDecoration: 'none', cursor: 'pointer'
                            }}>
                            ↓ Download
                          </a>
                          <a
                            href={photo.unsplashUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: 'none',
                              border: '1px solid rgba(255,255,255,.3)',
                              borderRadius: 3, padding: '6px 12px',
                              fontFamily: 'var(--mono)', fontSize: 9,
                              letterSpacing: '.1em', textTransform: 'uppercase',
                              color: 'white', textDecoration: 'none'
                            }}>
                            View ↗
                          </a>
                        </div>
                        <div className="photo-credit">
                          Photo by{' '}
                          <a
                            href={photo.photographerUrl + '?utm_source=ideabylunch&utm_medium=referral'}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#c8ff00', textDecoration: 'none' }}>
                            {photo.photographer}
                          </a>
                          {' '}on{' '}
                          <a
                            href="https://unsplash.com?utm_source=ideabylunch&utm_medium=referral"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#4a6080', textDecoration: 'none' }}>
                            Unsplash
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* All categories */}
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 9,
                    letterSpacing: '.1em', textTransform: 'uppercase',
                    color: '#4a6080', marginTop: 20, marginBottom: 10
                  }}>
                    Browse by category
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {data.prompts.map((p, i) => {
                      const col = USE_COLORS[p.use] || '#c8ff00'
                      const count = (data.photos[p.use] || []).length
                      return (
                        <button
                          key={i}
                          onClick={() => setActivePromptIdx(i)}
                          style={{
                            background: activePromptIdx === i ? `${col}12` : 'none',
                            border: `1px solid ${activePromptIdx === i ? col + '55' : 'rgba(168,192,255,.08)'}`,
                            borderRadius: 3,
                            padding: '5px 12px',
                            fontFamily: 'var(--mono)',
                            fontSize: 9,
                            letterSpacing: '.1em',
                            textTransform: 'uppercase',
                            color: activePromptIdx === i ? col : '#4a6080',
                            cursor: 'pointer',
                            transition: 'all .15s'
                          }}>
                          {p.use} {count > 0 ? `(${count})` : ''}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : data.loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: 120 }} />
                  ))}
                </div>
              ) : (
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: '#4a6080', textAlign: 'center', padding: '24px 0'
                }}>
                  Select a category above to browse photos
                </div>
              )}

              {/* Unsplash attribution */}
              <div style={{
                marginTop: 16,
                padding: '10px 14px',
                background: '#1a2236',
                border: '1px solid rgba(168,192,255,.06)',
                borderRadius: 4,
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: '#4a6080',
                lineHeight: 1.7
              }}>
                ✦ All photos from <a href="https://unsplash.com?utm_source=ideabylunch&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ color: '#c8ff00', textDecoration: 'none' }}>Unsplash</a> — free to use for commercial and personal projects. Please credit the photographer.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
