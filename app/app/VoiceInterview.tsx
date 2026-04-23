'use client'
import { useState, useEffect, useRef } from 'react'

const QUESTIONS = [
  {
    id: 'business',
    prompt: "What's your business called, and what do you do?",
    hint: "e.g. \"Mike's Plumbing — we fix leaks and install pipes in Accra\"",
  },
  {
    id: 'customers',
    prompt: "Who are your customers, and what problem do you solve for them?",
    hint: "e.g. \"Homeowners who have burst pipes and need someone fast\"",
  },
  {
    id: 'goal',
    prompt: "What's the main thing you want your website or app to do for your business?",
    hint: "e.g. \"Get people to call me\" or \"Show my menu and take orders\"",
  },
]

interface Answer { id: string; text: string }
interface Props { onComplete: (prefill: string) => void; onSkip: () => void }

export default function VoiceInterview({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState<'intro' | 'question' | 'done'>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [fallback, setFallback] = useState('')
  const [useFallback, setUseFallback] = useState(false)
  const recogRef = useRef<any>(null)
  const finalRef = useRef('')

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); setUseFallback(true) }
  }, [])

  function startListening() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const recog = new SR()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'
    finalRef.current = transcript

    recog.onresult = (e: any) => {
      let interim = ''
      let final = finalRef.current
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) { final += (final ? ' ' : '') + t }
        else interim = t
      }
      finalRef.current = final
      setTranscript(final + (interim ? ' ' + interim : ''))
    }
    recog.onerror = () => { setListening(false) }
    recog.onend = () => { setListening(false) }
    recog.start()
    recogRef.current = recog
    setListening(true)
  }

  function stopListening() {
    recogRef.current?.stop()
    setListening(false)
  }

  function next() {
    const text = useFallback ? fallback.trim() : transcript.trim()
    if (!text) return
    const updated = [...answers, { id: QUESTIONS[qIndex].id, text }]
    setAnswers(updated)
    setTranscript(''); finalRef.current = ''; setFallback('')

    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(qIndex + 1)
    } else {
      // Build prefill from all answers
      const prefill = updated.map((a, i) => {
        const q = QUESTIONS[i]
        return `${q.prompt.replace('?', '')}: ${a.text}`
      }).join('. ')
      onComplete(prefill)
    }
  }

  function toggleMic() {
    if (listening) stopListening()
    else startListening()
  }

  const q = QUESTIONS[qIndex]
  const progress = (qIndex / QUESTIONS.length) * 100
  const hasText = useFallback ? fallback.trim().length > 0 : transcript.trim().length > 0

  return (
    <div style={{ animation: 'fadeUp .4s ease both' }}>
      <style>{`
        @keyframes ripple { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.5);opacity:0} }
        @keyframes pulse2 { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>

      {/* Progress */}
      <div style={{ height: 2, background: 'rgba(0,0,0,.06)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#FF3B30', borderRadius: 2, width: `${progress}%`, transition: 'width .4s ease' }} />
      </div>

      {step === 'intro' && (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 10px' }}>
            Tell me about your business
          </h2>
          <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.6, margin: '0 0 28px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            I'll ask you {QUESTIONS.length} quick questions. Just speak naturally — 10 seconds each. I'll write the brief from your answers.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={() => setStep('question')}
              style={{ background: '#FF3B30', color: '#fff', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
            >
              🎙 Start interview →
            </button>
            <button
              onClick={onSkip}
              style={{ background: 'rgba(0,0,0,.05)', color: '#6E6E73', border: 'none', borderRadius: 12, padding: '13px 18px', fontSize: 15, cursor: 'pointer' }}
            >
              Type instead
            </button>
          </div>
        </div>
      )}

      {step === 'question' && (
        <div>
          {/* Back + counter */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <button onClick={() => qIndex === 0 ? setStep('intro') : setQIndex(q => q - 1)} style={{ background: 'none', border: 'none', fontSize: 14, color: '#6E6E73', cursor: 'pointer', padding: 0 }}>
              ← Back
            </button>
            <span style={{ fontSize: 13, color: '#AEAEB2' }}>Question {qIndex + 1} of {QUESTIONS.length}</span>
          </div>

          {/* Question */}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.8px', lineHeight: 1.3, margin: '0 0 6px' }}>
            {q.prompt}
          </h2>
          <p style={{ fontSize: 13, color: '#AEAEB2', margin: '0 0 28px' }}>{q.hint}</p>

          {!useFallback ? (
            <>
              {/* Mic button */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                  {listening && (
                    <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', background: 'rgba(255,59,48,.15)', animation: 'ripple 1.2s ease infinite' }} />
                  )}
                  <button
                    onClick={toggleMic}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: listening ? '#FF3B30' : '#1D1D1F', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, transition: 'background .2s', position: 'relative', zIndex: 1 }}
                  >
                    {listening ? '⏹' : '🎙'}
                  </button>
                </div>
                <p style={{ fontSize: 13, color: listening ? '#FF3B30' : '#AEAEB2', margin: 0, animation: listening ? 'pulse2 1.2s ease infinite' : 'none' }}>
                  {listening ? 'Listening… tap to stop' : 'Tap to speak'}
                </p>
              </div>

              {/* Live transcript */}
              <div style={{ minHeight: 72, background: transcript ? '#F9F9F9' : 'transparent', border: transcript ? '1px solid rgba(0,0,0,.06)' : '1px dashed rgba(0,0,0,.1)', borderRadius: 12, padding: '14px 16px', fontSize: 15, color: '#1D1D1F', lineHeight: 1.6, marginBottom: 16, transition: 'all .2s' }}>
                {transcript || <span style={{ color: '#AEAEB2' }}>Your answer will appear here…</span>}
              </div>

              {!supported && (
                <p style={{ fontSize: 13, color: '#FF9500', margin: '0 0 12px' }}>
                  Voice not supported in this browser. <button onClick={() => setUseFallback(true)} style={{ background: 'none', border: 'none', color: '#0066CC', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}>Type instead</button>
                </p>
              )}
            </>
          ) : (
            <textarea
              value={fallback}
              onChange={e => setFallback(e.target.value)}
              placeholder={q.hint}
              autoFocus
              rows={3}
              style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', fontSize: 15, outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: 16, lineHeight: 1.6 }}
            />
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={next}
              disabled={!hasText}
              style={{ flex: 1, background: hasText ? '#1D1D1F' : 'rgba(0,0,0,.08)', color: hasText ? '#fff' : '#AEAEB2', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 600, cursor: hasText ? 'pointer' : 'not-allowed', transition: 'all .2s' }}
            >
              {qIndex < QUESTIONS.length - 1 ? 'Next question →' : 'Build my brief →'}
            </button>
            {!useFallback && supported && (
              <button
                onClick={() => setUseFallback(true)}
                style={{ background: 'rgba(0,0,0,.05)', color: '#6E6E73', border: 'none', borderRadius: 12, padding: '13px 16px', fontSize: 14, cursor: 'pointer' }}
              >
                Type
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
