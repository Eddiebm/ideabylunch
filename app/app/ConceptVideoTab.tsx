'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  vision: string
  tagline: string
  productName: string
}

type Status = 'idle' | 'submitting' | 'pending' | 'processing' | 'complete' | 'failed' | 'timeout'

const POLL_MS = 8000
const MAX_POLLS = 30

export default function ConceptVideoTab({ vision, tagline, productName }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [taskId, setTaskId] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const pollStatus = useCallback(async (tid: string) => {
    pollCount.current += 1
    if (pollCount.current > MAX_POLLS) {
      stopPolling(); setStatus('timeout')
      setErrorMsg('Generation timed out. Please try again.')
      return
    }
    try {
      const res = await fetch(`/api/video/status?task_id=${tid}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.status === 'complete' && data.video_url) {
        stopPolling(); setVideoUrl(data.video_url); setStatus('complete')
      } else if (data.status === 'failed') {
        stopPolling(); setStatus('failed'); setErrorMsg('Generation failed. Try again.')
      } else {
        setStatus(data.status === 'pending' ? 'pending' : 'processing')
      }
    } catch {}
  }, [stopPolling])

  const startPolling = useCallback((tid: string) => {
    stopPolling(); pollCount.current = 0
    pollRef.current = setInterval(() => pollStatus(tid), POLL_MS)
    pollStatus(tid)
  }, [pollStatus, stopPolling])

  useEffect(() => () => stopPolling(), [stopPolling])

  const handleGenerate = async () => {
    setStatus('submitting'); setVideoUrl(null); setErrorMsg(null); stopPolling()
    try {
      const res = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision, tagline, productName }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `Failed: ${res.status}`) }
      const data = await res.json()
      setTaskId(data.task_id); setStatus('pending'); startPolling(data.task_id)
    } catch (err: any) { setStatus('failed'); setErrorMsg(err.message) }
  }

  const isGenerating = ['submitting', 'pending', 'processing'].includes(status)
  const progressWidth: Record<Status, string> = {
    idle: '0%', submitting: '10%', pending: '28%',
    processing: '65%', complete: '100%', failed: '100%', timeout: '100%',
  }
  const progressColor = status === 'complete' ? '#30D158'
    : (status === 'failed' || status === 'timeout') ? '#FF3B30' : '#0066CC'

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73' }}>8</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.1px' }}>Video</span>
          {isGenerating && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F2F2F7', borderRadius: 100, padding: '2px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0066CC', animation: 'pulse .8s ease infinite' }} />
              <span style={{ fontSize: 11, color: '#6E6E73', fontWeight: 500 }}>{status === 'submitting' ? 'Submitting' : 'Generating'}</span>
            </div>
          )}
          {status === 'complete' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(48,209,88,.1)', borderRadius: 100, padding: '2px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#30D158' }} />
              <span style={{ fontSize: 11, color: '#30D158', fontWeight: 500 }}>Ready</span>
            </div>
          )}
        </div>
        {status === 'complete' && videoUrl ? (
          <button onClick={() => { navigator.clipboard.writeText(videoUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1800) }}
            style={{ background: 'transparent', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: 500, color: copiedLink ? '#30D158' : '#0066CC', cursor: 'pointer' }}>
            {copiedLink ? 'Copied' : 'Copy link'}
          </button>
        ) : (
          <span style={{ fontSize: 12, color: '#AEAEB2', fontWeight: 400 }}>Powered by Kling AI</span>
        )}
      </div>

      <div style={{ height: 2, background: 'rgba(0,0,0,.04)', width: '100%' }}>
        <div style={{ height: '100%', width: progressWidth[status], background: isGenerating ? `linear-gradient(90deg, ${progressColor}60, ${progressColor}, ${progressColor}60)` : progressColor, transition: 'width 0.9s ease', backgroundSize: '200% 100%', animation: isGenerating ? 'shimmer 1.8s linear infinite' : undefined }} />
      </div>

      <div style={{ padding: '20px 24px' }}>
        {status === 'idle' && (
          <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.6, margin: '0 0 20px' }}>
            Generate a 5-second cinematic visualization of {productName || 'your product'} — ready to share on LinkedIn, X, or embed in a pitch deck.
          </p>
        )}
        {status === 'complete' && videoUrl && (
          <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9', marginBottom: 16, boxShadow: '0 4px 24px rgba(0,0,0,.15)', animation: 'fadeUp .4s ease both' }}>
            <video src={videoUrl} controls autoPlay loop muted playsInline style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
          </div>
        )}
        {isGenerating && (
          <div style={{ background: '#F2F2F7', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,.12)', borderTopColor: '#0066CC', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F' }}>Kling AI is rendering your concept video</div>
              <div style={{ fontSize: 13, color: '#AEAEB2', marginTop: 2 }}>{status === 'pending' ? 'Queued — starting shortly' : '60–90 seconds remaining'}</div>
            </div>
          </div>
        )}
        {(status === 'failed' || status === 'timeout') && errorMsg && (
          <div style={{ background: '#FFF2F2', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#D70015', marginBottom: 16 }}>{errorMsg}</div>
        )}
        {status === 'complete' && videoUrl && (
          <a href={videoUrl} download="concept-video.mp4" target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#F2F2F7', color: '#1D1D1F', fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 16 }}>
            ↓ Download MP4
          </a>
        )}
        <button onClick={handleGenerate} disabled={isGenerating}
          style={{ background: isGenerating ? 'rgba(0,0,0,.05)' : '#0066CC', color: isGenerating ? '#AEAEB2' : '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px', cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s' }}>
          {isGenerating ? (
            <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#AEAEB2', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />{status === 'submitting' ? 'Submitting…' : 'Generating video…'}</>
          ) : status === 'complete' ? 'Regenerate' : 'Generate concept video'}
        </button>
        <div style={{ fontSize: 12, color: '#AEAEB2', marginTop: 8 }}>5 seconds · 720p · 16:9 · ~90 seconds to generate</div>
      </div>
    </div>
  )
}
