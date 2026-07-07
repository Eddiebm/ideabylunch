'use client'
import { useState, useCallback, useRef, useEffect } from 'react'

interface Props {
  vision: string
  tagline: string
  productName: string
  email?: string | null
}

type Status = 'idle' | 'recording' | 'done' | 'failed'

const W = 1920
const H = 1080
const DURATION = 5500

function easeOut(t: number, p = 3) { return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), p) }
function easeIn(t: number, p = 2) { return Math.pow(Math.min(Math.max(t, 0), 1), p) }
function prog(t: number, s: number, e: number) { return Math.min(Math.max((t - s) / (e - s), 0), 1) }

function drawFrame(ctx: CanvasRenderingContext2D, t: number, name: string, tag: string) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#060610'
  ctx.fillRect(0, 0, W, H)

  // Radial glow center
  const gAlpha = easeOut(prog(t, 0, 0.12))
  const g = ctx.createRadialGradient(W * 0.5, H * 0.44, 0, W * 0.5, H * 0.44, W * 0.52)
  g.addColorStop(0, `rgba(12, 20, 50, ${gAlpha * 0.9})`)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  const CY = H * 0.435

  // Product name
  const nT = prog(t, 0.06, 0.30)
  if (nT > 0) {
    const alpha = easeOut(nT)
    const y = CY + (1 - easeOut(nT, 5)) * 55
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = `700 ${Math.round(W * 0.054)}px "Helvetica Neue", Helvetica, Arial, sans-serif`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.length > 28 ? name.slice(0, 28) : name, W / 2, y)
    ctx.restore()
  }

  // Accent line draws out
  const lT = prog(t, 0.26, 0.44)
  if (lT > 0) {
    const w = easeOut(lT) * 130
    ctx.save()
    ctx.globalAlpha = easeOut(lT)
    ctx.fillStyle = '#0066CC'
    ctx.fillRect(W / 2 - w / 2, CY + 46, w, 3)
    ctx.restore()
  }

  // Tagline
  const tT = prog(t, 0.36, 0.60)
  if (tT > 0 && tag) {
    const display = tag.length > 72 ? tag.slice(0, 72) : tag
    const alpha = easeOut(tT) * 0.72
    const y = CY + 90 + (1 - easeOut(tT)) * 20
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = `400 ${Math.round(W * 0.018)}px "Helvetica Neue", Helvetica, Arial, sans-serif`
    ctx.fillStyle = '#AABBDD'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(display, W / 2, y)
    ctx.restore()
  }

  // Subtle dot grid
  const dT = prog(t, 0.45, 0.65)
  if (dT > 0) {
    ctx.save()
    ctx.globalAlpha = easeOut(dT) * 0.04
    ctx.fillStyle = '#FFFFFF'
    const spacing = 54
    for (let x = spacing; x < W; x += spacing) {
      for (let y = spacing; y < H; y += spacing) {
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  // Watermark
  const wT = prog(t, 0.52, 0.72)
  if (wT > 0) {
    ctx.save()
    ctx.globalAlpha = easeOut(wT) * 0.28
    ctx.font = `400 ${Math.round(W * 0.011)}px "Helvetica Neue", Helvetica, Arial, sans-serif`
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ideabylunch.com', W / 2, H * 0.875)
    ctx.restore()
  }

  // Fade to black
  const fT = prog(t, 0.86, 1.0)
  if (fT > 0) {
    ctx.save()
    ctx.globalAlpha = easeIn(fT)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}

async function recordCanvas(name: string, tag: string): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find(m => {
    try { return MediaRecorder.isTypeSupported(m) } catch { return false }
  }) || 'video/webm'

  const stream = canvas.captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType: mime })
  const chunks: Blob[] = []

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mime.split(';')[0] })
      resolve(URL.createObjectURL(blob))
    }
    recorder.onerror = reject

    const start = performance.now()
    recorder.start(80)

    function draw() {
      const elapsed = performance.now() - start
      drawFrame(ctx, Math.min(elapsed / DURATION, 1), name, tag)
      if (elapsed < DURATION) {
        requestAnimationFrame(draw)
      } else {
        recorder.stop()
      }
    }
    requestAnimationFrame(draw)
  })
}

export default function ConceptVideoTab({ tagline, productName }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const handleGenerate = useCallback(async () => {
    setStatus('recording')
    setVideoUrl(null)
    setErrorMsg(null)
    setElapsed(0)

    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e >= DURATION) { clearInterval(timerRef.current!); return DURATION }
        return e + 80
      })
    }, 80)

    try {
      const url = await recordCanvas(productName, tagline)
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(DURATION)
      setVideoUrl(url)
      setStatus('done')
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current)
      setStatus('failed')
      setErrorMsg(err.message || 'Recording failed')
    }
  }, [productName, tagline])

  const progress = status === 'recording' ? Math.min(elapsed / DURATION, 0.97) : status === 'done' ? 1 : 0
  const progressColor = status === 'done' ? '#30D158' : status === 'failed' ? '#FF3B30' : '#0066CC'
  const isRecording = status === 'recording'

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73' }}>8</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.1px' }}>Video</span>
          {isRecording && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F2F2F7', borderRadius: 100, padding: '2px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0066CC', animation: 'pulse .8s ease infinite' }} />
              <span style={{ fontSize: 11, color: '#6E6E73', fontWeight: 500 }}>Recording</span>
            </div>
          )}
          {status === 'done' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(48,209,88,.1)', borderRadius: 100, padding: '2px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#30D158' }} />
              <span style={{ fontSize: 11, color: '#30D158', fontWeight: 500 }}>Ready</span>
            </div>
          )}
        </div>
        {status === 'done' && videoUrl ? (
          <button onClick={() => { navigator.clipboard.writeText(videoUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1800) }}
            style={{ background: 'transparent', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: 500, color: copiedLink ? '#30D158' : '#0066CC', cursor: 'pointer' }}>
            {copiedLink ? 'Copied' : 'Copy link'}
          </button>
        ) : (
          <span style={{ fontSize: 12, color: '#AEAEB2', fontWeight: 400 }}>Generated in browser · free</span>
        )}
      </div>

      <div style={{ height: 2, background: 'rgba(0,0,0,.04)', width: '100%' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: progressColor, transition: 'width 0.1s linear' }} />
      </div>

      <div style={{ padding: '20px 24px' }}>
        {status === 'idle' && (
          <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.6, margin: '0 0 20px' }}>
            Generate a 5-second branded concept video for {productName || 'your product'} — rendered right in your browser, no credits needed.
          </p>
        )}

        {isRecording && (
          <div style={{ background: '#F2F2F7', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <span style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,.12)', borderTopColor: '#0066CC', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F' }}>Rendering concept video in browser</div>
              <div style={{ fontSize: 13, color: '#AEAEB2', marginTop: 2 }}>{Math.max(0, Math.ceil((DURATION - elapsed) / 1000))}s remaining</div>
            </div>
          </div>
        )}

        {status === 'done' && videoUrl && (
          <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9', marginBottom: 16, boxShadow: '0 4px 24px rgba(0,0,0,.15)' }}>
            <video src={videoUrl} controls autoPlay loop muted playsInline style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
          </div>
        )}

        {status === 'failed' && errorMsg && (
          <div style={{ background: '#FFF2F2', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#D70015', marginBottom: 16 }}>{errorMsg}</div>
        )}

        {status === 'done' && videoUrl && (
          <a href={videoUrl} download={`${productName || 'concept'}-video.webm`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#F2F2F7', color: '#1D1D1F', fontSize: 13, fontWeight: 500, textDecoration: 'none', marginBottom: 16 }}>
            ↓ Download video
          </a>
        )}

        <button onClick={handleGenerate} disabled={isRecording}
          style={{ background: isRecording ? 'rgba(0,0,0,.05)' : '#0066CC', color: isRecording ? '#AEAEB2' : '#FFFFFF', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px', cursor: isRecording ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s' }}>
          {isRecording ? (
            <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#AEAEB2', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Recording…</>
          ) : status === 'done' ? 'Regenerate' : 'Generate concept video'}
        </button>
        <div style={{ fontSize: 12, color: '#AEAEB2', marginTop: 8 }}>5 seconds · 1080p · 16:9 · renders in ~6s · free</div>
      </div>
    </div>
  )
}
