'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface QuizQuestion {
  q: string
  options: string[]
  correct: number
  explain: string
}

interface Module {
  id: string
  icon: string
  title: string
  tagline: string
  why: string
  points: string[]
  example: { prompt: string; result: string }
  quiz: QuizQuestion[]
}

const MODULES: Module[] = [
  {
    id: 'what-is-cowork',
    icon: '🤝',
    title: 'What is Cowork?',
    tagline: 'A teammate you delegate to, not a search box you copy-paste from.',
    why: 'Most people treat AI chat like a search engine: type a question, get an answer, copy it out. Cowork works differently — you hand it a real task with a real outcome, and it works the task the way a capable new hire would: reading what it needs, using the right tools, and coming back with a finished result.',
    points: [
      'You describe the outcome and the constraints — not the exact steps to get there.',
      'Cowork can read and write real files (Word, Excel, PowerPoint, PDF), browse the web, and connect to apps your business already uses.',
      'It works inside a session that remembers context, so you can correct course instead of starting over.',
      'It is not magic — it is a fast, tireless collaborator that still needs direction and review.',
    ],
    example: {
      prompt: '"Read the attached call notes and draft a follow-up email to the client, keeping the tone warm but concise."',
      result: 'A draft email in your voice, ready to review and send — not a generic template you have to rewrite.',
    },
    quiz: [
      {
        q: 'What is the biggest mindset shift when moving from a chatbot to Cowork?',
        options: [
          'You need to learn to write code first',
          'You describe the outcome and constraints, not the exact steps',
          'You can only use it for writing emails',
          'It replaces the need for any human review',
        ],
        correct: 1,
        explain: 'Cowork is built for delegation: tell it what "done" looks like and let it figure out the path, the same way you would brief a new hire.',
      },
      {
        q: 'True or false: Cowork can only work inside a chat window and cannot touch real files.',
        options: ['True', 'False'],
        correct: 1,
        explain: 'False — Cowork can read and produce real Word, Excel, PowerPoint, and PDF files, among other formats.',
      },
    ],
  },
  {
    id: 'first-session',
    icon: '🚀',
    title: 'Your first session',
    tagline: 'Brief it like you would brief a smart new hire on day one.',
    why: 'The quality of what you get back is almost entirely a function of the quality of the brief you give. A vague ask gets a vague answer. A clear goal, some context, and a couple of constraints gets something you can actually use.',
    points: [
      'State the goal first: what does a good result look like?',
      'Give context Cowork would not otherwise have — audience, tone, prior decisions, files to reference.',
      'Set constraints: length, format, deadline, things to avoid.',
      'Expect clarifying questions on ambiguous asks — answering them well is part of the job, not a sign something went wrong.',
      'You can redirect mid-task. If the first draft is off, say so specifically instead of starting a new session.',
    ],
    example: {
      prompt: '"We are launching a loyalty program for our 3 cafe locations next month. Draft a one-page announcement for staff — friendly, under 300 words, and make it clear tips are unaffected."',
      result: 'A focused draft that matches your actual launch, not a generic loyalty-program template.',
    },
    quiz: [
      {
        q: 'What most improves the quality of Cowork\'s output?',
        options: [
          'Using technical jargon',
          'A clear goal, context, and constraints in the brief',
          'Keeping the request as short as possible, even if vague',
          'Never answering clarifying questions',
        ],
        correct: 1,
        explain: 'Clear goals, relevant context, and explicit constraints consistently produce better first drafts than short, vague requests.',
      },
      {
        q: 'If the first draft misses the mark, what should you do?',
        options: [
          'Start an entirely new session from scratch every time',
          'Give up on the task',
          'Tell it specifically what to change, in the same session',
          'Assume it cannot be fixed',
        ],
        correct: 2,
        explain: 'Cowork keeps context within a session, so specific, targeted feedback is usually faster than starting over.',
      },
    ],
  },
  {
    id: 'real-documents',
    icon: '📄',
    title: 'Real documents, not just chat',
    tagline: 'Word, Excel, PowerPoint, and PDF — the files your team already uses.',
    why: 'Business work does not live in a chat window — it lives in slide decks, spreadsheets, and contracts. Cowork can open, edit, and generate those actual file formats, so the output is something you can hand off, not something you have to reformat first.',
    points: [
      'Ask Cowork to turn messy notes into a formatted Word document with proper headings and structure.',
      'Hand it a spreadsheet and ask for cleanup, formulas, pivot summaries, or charts.',
      'Ask for a first-draft slide deck from a brief or an existing document.',
      'It can extract data from a PDF (including scanned ones) instead of you retyping it.',
    ],
    example: {
      prompt: '"Here is last quarter\'s raw sales export. Clean it up, add a pivot table by region, and build 3 summary charts."',
      result: 'A working spreadsheet with the cleanup and charts already done — not a description of how you could do it.',
    },
    quiz: [
      {
        q: 'Which of these can Cowork work with directly?',
        options: [
          'Only plain text pasted into chat',
          'Word, Excel, PowerPoint, and PDF files',
          'Only images',
          'Only Google Docs',
        ],
        correct: 1,
        explain: 'Cowork can read and produce the standard office file formats your business already runs on.',
      },
    ],
  },
  {
    id: 'connect-tools',
    icon: '🔌',
    title: 'Connecting your tools',
    tagline: 'Let Cowork work inside the apps you already use — with your permission.',
    why: 'Copying data between five different tools by hand is where a lot of busywork lives. Connectors let Cowork read and draft directly inside apps like email, cloud drives, and code hosts, so you are not the manual bridge between systems.',
    points: [
      'Each connector (e.g. email, cloud storage, source control) has to be explicitly granted — nothing connects itself.',
      'You control what is connected per session, and it can be revoked at any time.',
      'Connected tools let Cowork answer questions like "find last month\'s invoice" without you hunting for the file first.',
      'Sensitive actions inside a connected tool — sending an email, changing a file others rely on — deserve a review step, covered in Module 7.',
    ],
    example: {
      prompt: '"Search my inbox for the vendor contract thread from last month and summarize the agreed pricing."',
      result: 'A short summary pulled from the actual thread, with nothing manually copy-pasted by you.',
    },
    quiz: [
      {
        q: 'How does a tool (like email or a cloud drive) get connected to Cowork?',
        options: [
          'It connects automatically the first time you mention it',
          'You explicitly grant the connection, and can revoke it later',
          'It cannot be connected at all',
          'An administrator must rewrite the app\'s code',
        ],
        correct: 1,
        explain: 'Connections are opt-in and revocable — you decide what Cowork can reach.',
      },
    ],
  },
  {
    id: 'automate-repeat-work',
    icon: '⏰',
    title: 'Automating the repeat work',
    tagline: 'Say it once, and let it run on a schedule.',
    why: 'A lot of business work is the same task, repeated on a cadence: a weekly numbers summary, a Monday morning brief, a recurring status check. Instead of asking for it fresh every time, you can set it up once as a routine.',
    points: [
      'A routine is a task that fires on a schedule you set — daily, weekly, or a specific one-off time.',
      'Good candidates: recurring reports, status checks, digest emails, reminders tied to a cadence.',
      'You stay in control: routines can be paused, edited, or deleted at any time.',
      'Start with a task you already do manually and repeatedly — that is usually the best first routine to automate.',
    ],
    example: {
      prompt: '"Every Monday at 8am, pull last week\'s numbers and email me a 5-bullet summary."',
      result: 'The summary lands in your inbox automatically, every week, with no one having to remember to run it.',
    },
    quiz: [
      {
        q: 'What is the best kind of task to turn into a routine?',
        options: [
          'A one-time creative brainstorm',
          'Something you already do manually on a repeating schedule',
          'A task that changes completely every time',
          'Anything involving a sensitive one-time decision',
        ],
        correct: 1,
        explain: 'Routines shine on recurring, predictable work — the exact tasks that are tedious precisely because you do them over and over.',
      },
    ],
  },
  {
    id: 'delegate-big-projects',
    icon: '🧩',
    title: 'Delegating bigger projects',
    tagline: 'For work too big for one pass, Cowork can split it up and bring back one clean result.',
    why: 'Some tasks are too broad for a single straightforward pass — a competitive audit, a research sweep across many sources, a multi-part report. Cowork can break these into parallel tracks internally and combine the results, so you still just ask for the outcome.',
    points: [
      'You do not need to know how the work gets split up — you describe the deliverable.',
      'This is best reserved for genuinely broad tasks, not quick single-answer questions.',
      'Expect it to take longer than a simple chat reply — comprehensive work takes more time to do well.',
      'Review the combined result the same way you would review a big report from a team: check the seams.',
    ],
    example: {
      prompt: '"Audit our top 5 competitors\' websites for pricing, positioning, and key features, and summarize the differences in a table."',
      result: 'One consolidated comparison, even though pulling it together touched five separate sources.',
    },
    quiz: [
      {
        q: 'When is it worth asking Cowork to tackle a large, multi-part project in one request?',
        options: [
          'Only for single-fact lookups',
          'When the task is genuinely broad and benefits from being split into parallel tracks',
          'Never — always break it into 20 tiny chats yourself',
          'Only when no review is needed afterward',
        ],
        correct: 1,
        explain: 'Broad, multi-source deliverables are exactly the case where letting Cowork organize the work internally saves you the manual coordination.',
      },
    ],
  },
  {
    id: 'trust-but-verify',
    icon: '🔍',
    title: 'Trust, but verify',
    tagline: 'Treat AI output like a capable new hire\'s first draft.',
    why: 'Cowork is fast and usually good — but it is not infallible, and it should never be the last check on anything that matters. Building the review habit early is what makes AI-assisted work safe to rely on.',
    points: [
      'Ask for sources or reasoning on anything factual you plan to rely on or repeat externally.',
      'Anything sensitive — sending an email, posting publicly, changing numbers that affect money — should get a human look before it goes out.',
      'Never paste passwords, API keys, or other secrets into a chat.',
      'If something looks off, say so — treat a wrong answer as useful feedback, not a dead end.',
    ],
    example: {
      prompt: '"Before you send that email to the client, show me the draft first."',
      result: 'You keep the final say on anything that leaves the building.',
    },
    quiz: [
      {
        q: 'What should always happen before a sensitive action (like sending an external email) goes out?',
        options: [
          'Nothing — let it send automatically',
          'A human review step',
          'It should be avoided entirely',
          'It should be repeated three times',
        ],
        correct: 1,
        explain: 'Sensitive, externally visible, or financially relevant actions should always get a human check before they go out.',
      },
      {
        q: 'Is it safe to paste a password or API key into a chat to get help faster?',
        options: ['Yes, if the task is urgent', 'No, never'],
        correct: 1,
        explain: 'Secrets should never be pasted into a chat, no matter how time-pressured the task is.',
      },
    ],
  },
  {
    id: 'playbook-by-role',
    icon: '📋',
    title: 'A playbook by role',
    tagline: 'Where to start, based on what you actually do all day.',
    why: 'The fastest way to build the habit is to apply it to work you already own. Here is where each role tends to see the quickest wins.',
    points: [
      'Marketing: draft campaigns, repurpose one piece of content into five formats, summarize competitor positioning.',
      'Sales & Customer Success: summarize call notes, draft tailored follow-ups, assemble first-draft proposals.',
      'Operations & Finance: clean up spreadsheets, build recurring reports, reconcile data from multiple exports.',
      'Executives & Assistants: morning briefs, meeting prep summaries, first-draft memos and announcements.',
    ],
    example: {
      prompt: '"I\'m in ops — my Mondays start with pulling numbers from three different exports into one summary. Help me turn that into a routine."',
      result: 'A concrete starting point instead of a vague "try using AI more" — one real task, automated.',
    },
    quiz: [
      {
        q: 'What is the best way to start building the Cowork habit?',
        options: [
          'Wait until a big, unfamiliar project comes along',
          'Apply it to a real, recurring task you already own',
          'Only use it for tasks unrelated to your job',
          'Avoid using it until you\'ve read a full manual',
        ],
        correct: 1,
        explain: 'Starting on familiar, recurring work makes it easy to judge the output and builds the habit fastest.',
      },
    ],
  },
]

type Answers = Record<string, number[]>
type Completed = Record<string, boolean>

const STORAGE_KEY = 'cowork-course-progress-v1'

export default function CoworkApp() {
  const [active, setActive] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [completed, setCompleted] = useState<Completed>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setCompleted(parsed.completed || {})
        setAnswers(parsed.answers || {})
        setSubmitted(parsed.submitted || {})
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed, answers, submitted }))
    } catch {}
  }, [completed, answers, submitted, loaded])

  const mod = MODULES[active]
  const doneCount = Object.values(completed).filter(Boolean).length
  const pct = Math.round((doneCount / MODULES.length) * 100)

  function selectAnswer(qIndex: number, optIndex: number) {
    if (submitted[mod.id]) return
    setAnswers(prev => {
      const arr = [...(prev[mod.id] || Array(mod.quiz.length).fill(-1))]
      arr[qIndex] = optIndex
      return { ...prev, [mod.id]: arr }
    })
  }

  function submitQuiz() {
    const arr = answers[mod.id] || []
    if (arr.filter(a => a !== undefined && a !== -1).length < mod.quiz.length) return
    setSubmitted(prev => ({ ...prev, [mod.id]: true }))
    const allCorrect = mod.quiz.every((q, i) => arr[i] === q.correct)
    if (allCorrect) setCompleted(prev => ({ ...prev, [mod.id]: true }))
  }

  function retryQuiz() {
    setSubmitted(prev => ({ ...prev, [mod.id]: false }))
    setAnswers(prev => ({ ...prev, [mod.id]: Array(mod.quiz.length).fill(-1) }))
  }

  const currentAnswers = answers[mod.id] || Array(mod.quiz.length).fill(-1)
  const isSubmitted = !!submitted[mod.id]
  const allCorrect = isSubmitted && mod.quiz.every((q, i) => currentAnswers[i] === q.correct)
  const allDone = doneCount === MODULES.length

  return (
    <>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        a { text-decoration: none; }
        .cw-grid { display: grid; grid-template-columns: 260px 1fr; gap: 24px; align-items: start; }
        @media (max-width: 780px) { .cw-grid { grid-template-columns: 1fr; } .cw-sidebar { order: 2; } .cw-main { order: 1; } }
        .cw-option:hover { border-color: rgba(0,0,0,.25) !important; }
      `}</style>

      <nav style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F' }}>IdeaByLunch</Link>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#6E6E73' }}>{doneCount}/{MODULES.length} modules complete</span>
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,.08)', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>🤝 Learn Cowork for Business</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 10px' }}>
            A working guide to Cowork for business people
          </h1>
          <p style={{ fontSize: 16, color: '#6E6E73', maxWidth: 560, margin: '0 auto' }}>
            No coding required. Eight short modules — what it is, how to brief it, and where it fits into work you already do.
          </p>
          <div style={{ maxWidth: 400, margin: '24px auto 0' }}>
            <div style={{ height: 8, borderRadius: 100, background: 'rgba(0,0,0,.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#30D158', transition: 'width .3s ease' }} />
            </div>
          </div>
        </div>

        {allDone && (
          <div style={{ background: '#1D1D1F', color: '#fff', borderRadius: 20, padding: '32px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Course complete</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', margin: 0 }}>
              You've covered the full playbook — briefing, files, connectors, automation, delegation, and review habits. Time to put it to work.
            </p>
          </div>
        )}

        <div className="cw-grid">
          <div className="cw-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {MODULES.map((m, i) => {
              const isActive = i === active
              const isDone = !!completed[m.id]
              return (
                <button
                  key={m.id}
                  onClick={() => setActive(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    border: isActive ? '0.5px solid rgba(0,0,0,.08)' : '0.5px solid transparent',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
                    borderRadius: 12, padding: '10px 12px', cursor: 'pointer', width: '100%',
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: isDone ? '#30D158' : 'rgba(0,0,0,.06)',
                    color: isDone ? '#fff' : '#6E6E73',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                  }}>
                    {isDone ? '✓' : i + 1}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: '#1D1D1F' }}>{m.title}</span>
                </button>
              )
            })}
          </div>

          <div className="cw-main" style={{ background: '#fff', borderRadius: 20, padding: '36px', border: '0.5px solid rgba(0,0,0,.08)', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>{mod.icon}</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.5px', margin: '0 0 6px' }}>{mod.title}</h2>
            <p style={{ fontSize: 15, color: '#6E6E73', margin: '0 0 24px', fontStyle: 'italic' }}>{mod.tagline}</p>

            <p style={{ fontSize: 15, lineHeight: 1.6, color: '#1D1D1F', margin: '0 0 20px' }}>{mod.why}</p>

            <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {mod.points.map((p, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14.5, lineHeight: 1.5, color: '#1D1D1F' }}>
                  <span style={{ color: '#0066CC', flexShrink: 0 }}>—</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div style={{ background: '#F2F2F7', borderRadius: 14, padding: '18px 20px', marginBottom: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6E6E73', letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 8px' }}>Try this prompt</p>
              <p style={{ fontSize: 14.5, color: '#1D1D1F', margin: '0 0 10px', fontStyle: 'italic' }}>{mod.example.prompt}</p>
              <p style={{ fontSize: 13, color: '#6E6E73', margin: 0 }}>→ {mod.example.result}</p>
            </div>

            <div style={{ borderTop: '0.5px solid rgba(0,0,0,.08)', paddingTop: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F', margin: '0 0 16px' }}>Quick check</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {mod.quiz.map((q, qi) => (
                  <div key={qi}>
                    <p style={{ fontSize: 14.5, fontWeight: 500, color: '#1D1D1F', margin: '0 0 10px' }}>{qi + 1}. {q.q}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {q.options.map((opt, oi) => {
                        const selected = currentAnswers[qi] === oi
                        let borderColor = 'rgba(0,0,0,.12)'
                        let bg = '#fff'
                        if (isSubmitted) {
                          if (oi === q.correct) { borderColor = '#30D158'; bg = 'rgba(48,209,88,.08)' }
                          else if (selected && oi !== q.correct) { borderColor = '#FF3B30'; bg = 'rgba(255,59,48,.06)' }
                        } else if (selected) {
                          borderColor = '#0066CC'; bg = 'rgba(0,102,204,.05)'
                        }
                        return (
                          <button
                            key={oi}
                            className="cw-option"
                            onClick={() => selectAnswer(qi, oi)}
                            disabled={isSubmitted}
                            style={{
                              textAlign: 'left', fontSize: 14, color: '#1D1D1F', padding: '10px 14px',
                              borderRadius: 10, border: `1.5px solid ${borderColor}`, background: bg,
                              cursor: isSubmitted ? 'default' : 'pointer',
                            }}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    {isSubmitted && (
                      <p style={{ fontSize: 12.5, color: '#6E6E73', margin: '8px 0 0', lineHeight: 1.5 }}>{q.explain}</p>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                {!isSubmitted ? (
                  <button
                    onClick={submitQuiz}
                    style={{ background: '#1D1D1F', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Check answers
                  </button>
                ) : allCorrect ? (
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#30D158' }}>✓ Nice — module complete</span>
                ) : (
                  <button
                    onClick={retryQuiz}
                    style={{ background: '#FF3B30', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '0.5px solid rgba(0,0,0,.08)' }}>
              <button
                onClick={() => setActive(a => Math.max(0, a - 1))}
                disabled={active === 0}
                style={{ fontSize: 14, fontWeight: 500, color: active === 0 ? '#C7C7CC' : '#1D1D1F', background: 'none', border: 'none', cursor: active === 0 ? 'default' : 'pointer' }}
              >
                ← Previous
              </button>
              <button
                onClick={() => setActive(a => Math.min(MODULES.length - 1, a + 1))}
                disabled={active === MODULES.length - 1}
                style={{ fontSize: 14, fontWeight: 500, color: active === MODULES.length - 1 ? '#C7C7CC' : '#0066CC', background: 'none', border: 'none', cursor: active === MODULES.length - 1 ? 'default' : 'pointer' }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
