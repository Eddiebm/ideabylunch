'use client'
import { useState } from 'react'

type BuildType = 'website' | 'mobile' | 'saas'

interface WizardResult {
  type: BuildType
  answers: Record<string, string>
  prefill: string
}

const TYPES = [
  { id: 'website' as BuildType, icon: '🌐', label: 'Website',      sub: 'Business site, portfolio, landing page' },
  { id: 'mobile'  as BuildType, icon: '📱', label: 'Mobile App',   sub: 'iOS, Android, or both'                  },
  { id: 'saas'    as BuildType, icon: '⚡', label: 'Software/SaaS', sub: 'Web app, dashboard, platform'           },
]

type Question = { id: string; q: string; type: 'tiles' | 'text'; options?: string[] }

const QUESTIONS: Record<BuildType, Question[]> = {
  website: [
    { id: 'industry', q: 'What type of business?', type: 'tiles', options: ['Salon / Barbershop', 'Restaurant / Food', 'Clinic / Health', 'Legal / Finance', 'Retail / Shop', 'Trades / Services', 'Other'] },
    { id: 'goal',     q: "What's the main goal?",  type: 'tiles', options: ['Get calls & bookings', 'Showcase my work', 'Sell products online', 'Just be found online'] },
    { id: 'location', q: 'City or region?',         type: 'text'  },
    { id: 'extras',   q: 'Anything else to know?',  type: 'text'  },
  ],
  mobile: [
    { id: 'platform', q: 'Which platform?',         type: 'tiles', options: ['iOS only', 'Android only', 'Both iOS & Android'] },
    { id: 'category', q: 'What does it do?',        type: 'tiles', options: ['Connect people', 'Sell products/services', 'Track or manage something', 'Entertainment', 'Other'] },
    { id: 'audience', q: 'Who are your users?',     type: 'tiles', options: ['Consumers (B2C)', 'Businesses (B2B)', 'Both'] },
    { id: 'extras',   q: 'Anything else to know?',  type: 'text'  },
  ],
  saas: [
    { id: 'audience', q: 'Who is it for?',           type: 'tiles', options: ['Small businesses', 'Enterprise', 'Consumers', 'Developers'] },
    { id: 'feature',  q: 'Core feature?',            type: 'tiles', options: ['Dashboard & analytics', 'Automation', 'Marketplace', 'Communication', 'Other'] },
    { id: 'pricing',  q: 'Pricing model?',           type: 'tiles', options: ['Free / Freemium', 'Monthly subscription', 'One-time payment', 'Usage-based'] },
    { id: 'extras',   q: 'Anything else to know?',   type: 'text'  },
  ],
}

function buildPrefill(type: BuildType, answers: Record<string, string>): string {
  const q = QUESTIONS[type]
  const parts: string[] = []

  if (type === 'website') {
    parts.push(`I want a ${answers.industry || 'business'} website`)
    if (answers.location) parts.push(`based in ${answers.location}`)
    if (answers.goal) parts.push(`The main goal is to ${answers.goal.toLowerCase()}`)
    if (answers.extras) parts.push(answers.extras)
  } else if (type === 'mobile') {
    parts.push(`I want to build a ${answers.platform || 'cross-platform'} mobile app`)
    if (answers.category) parts.push(`It will ${answers.category.toLowerCase()}`)
    if (answers.audience) parts.push(`Target users: ${answers.audience.toLowerCase()}`)
    if (answers.extras) parts.push(answers.extras)
  } else {
    parts.push(`I want to build a SaaS product for ${answers.audience || 'businesses'}`)
    if (answers.feature) parts.push(`Core feature: ${answers.feature.toLowerCase()}`)
    if (answers.pricing) parts.push(`Pricing: ${answers.pricing.toLowerCase()}`)
    if (answers.extras) parts.push(answers.extras)
  }

  return parts.join('. ').replace(/\.\./g, '.') + (parts.length ? '.' : '')
}

interface Props {
  onComplete: (result: WizardResult) => void
  onSkip: () => void
  onVoice?: () => void
}

export default function IdeaWizard({ onComplete, onSkip, onVoice }: Props) {
  const [step, setStep] = useState<'type' | 'questions' | 'review'>('type')
  const [buildType, setBuildType] = useState<BuildType | null>(null)
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [textInput, setTextInput] = useState('')

  function selectType(t: BuildType) {
    setBuildType(t)
    setStep('questions')
    setQIndex(0)
    setAnswers({})
    setTextInput('')
  }

  function currentQ() {
    if (!buildType) return null
    return QUESTIONS[buildType][qIndex]
  }

  function answer(val: string) {
    const q = currentQ()!
    const updated = { ...answers, [q.id]: val }
    setAnswers(updated)
    setTextInput('')
    const qs = QUESTIONS[buildType!]
    if (qIndex < qs.length - 1) {
      setQIndex(qIndex + 1)
    } else {
      const prefill = buildPrefill(buildType!, updated)
      onComplete({ type: buildType!, answers: updated, prefill })
    }
  }

  function answerText() {
    answer(textInput.trim())
  }

  function back() {
    if (step === 'questions' && qIndex === 0) {
      setStep('type')
      setBuildType(null)
    } else if (step === 'questions') {
      setQIndex(qIndex - 1)
      setTextInput(answers[QUESTIONS[buildType!][qIndex - 1].id] || '')
    }
  }

  const questions = buildType ? QUESTIONS[buildType] : []
  const progress = step === 'type' ? 0 : ((qIndex + 1) / (questions.length + 1))

  return (
    <div style={{ animation: 'fadeUp .4s ease both' }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(0,0,0,.06)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#0066CC', borderRadius: 2, width: `${progress * 100}%`, transition: 'width .3s ease' }} />
      </div>

      {/* Step: choose type */}
      {step === 'type' && (
        <div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 6px' }}>What are you building?</h2>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: '0 0 24px' }}>Pick a type to get started — takes 30 seconds.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => selectType(t.id)}
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 14, padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', transition: 'all .15s', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#0066CC'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(0,102,204,.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,.08)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.04)' }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', marginBottom: 2 }}>{t.label}</div>
                  <div style={{ fontSize: 13, color: '#6E6E73' }}>{t.sub}</div>
                </div>
                <svg style={{ marginLeft: 'auto', flexShrink: 0 }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="#AEAEB2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
            {onVoice && (
              <button onClick={onVoice} style={{ background: 'none', border: 'none', fontSize: 14, color: '#FF3B30', cursor: 'pointer', fontWeight: 600 }}>
                🎙 Use voice instead
              </button>
            )}
            <button onClick={onSkip} style={{ background: 'none', border: 'none', fontSize: 14, color: '#AEAEB2', cursor: 'pointer', textDecoration: 'underline' }}>
              Skip — just let me type
            </button>
          </div>
        </div>
      )}

      {/* Step: questions */}
      {step === 'questions' && buildType && (() => {
        const q = currentQ()!
        return (
          <div>
            {/* Back + step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button onClick={back} style={{ background: 'none', border: 'none', fontSize: 14, color: '#6E6E73', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                ← Back
              </button>
              <span style={{ fontSize: 13, color: '#AEAEB2' }}>{qIndex + 1} of {questions.length}</span>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.8px', margin: '0 0 20px' }}>{q.q}</h2>

            {q.type === 'tiles' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options!.map(opt => (
                  <button
                    key={opt}
                    onClick={() => answer(opt)}
                    style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: 12, padding: '13px 18px', cursor: 'pointer', textAlign: 'left', fontSize: 15, fontWeight: 500, color: '#1D1D1F', transition: 'all .15s', boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F0F6FF'; (e.currentTarget as HTMLElement).style.borderColor = '#0066CC' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,.08)' }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && textInput.trim() && answerText()}
                  placeholder={q.id === 'location' ? 'e.g. Accra, Ghana' : 'Optional — press Enter to skip'}
                  autoFocus
                  style={{ width: '100%', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,.1)', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={answerText}
                    style={{ background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer', flex: 1 }}
                  >
                    {qIndex < questions.length - 1 ? 'Next →' : 'Build my brief →'}
                  </button>
                  <button
                    onClick={() => answer('')}
                    style={{ background: 'rgba(0,0,0,.05)', color: '#6E6E73', border: 'none', borderRadius: 10, padding: '11px 18px', fontSize: 15, cursor: 'pointer' }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
