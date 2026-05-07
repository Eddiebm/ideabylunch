export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRedis } from '@/app/lib/redis'
import type { StoredAudit } from '@/app/api/audit/route'
import UpgradeButton from './UpgradeButton'
import ShareButtons from './ShareButtons'

async function getAudit(slug: string): Promise<StoredAudit | null> {
  const redis = getRedis()
  if (!redis) return null
  const raw = await redis.get<StoredAudit | string>(`audit:${slug}`)
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as StoredAudit } catch { return null }
  }
  return raw as StoredAudit
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getAudit(slug)
  if (!data) return { title: 'Audit not found' }
  const score = data.audit.convictionScore
  return {
    title: `${data.domain} site audit — ${score}/100 conviction · IdeaByLunch`,
    description: data.audit.oneSentenceVerdict,
    alternates: { canonical: `/audit/${slug}` },
    openGraph: {
      title: `${data.domain} scored ${score}/100 — IdeaByLunch audit`,
      description: data.audit.oneSentenceVerdict,
      url: `https://ideabylunch.com/audit/${slug}`,
      type: 'article',
    },
  }
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#30D158' : score >= 50 ? '#FF9500' : '#FF3B30'
  const size = 140
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="#F2F2F7" strokeWidth={stroke} fill="none" />
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dy=".1em" fontSize="40" fontWeight="800" fill="#1D1D1F" letterSpacing="-1.5">{score}</text>
      <text x="50%" y="68%" textAnchor="middle" fontSize="11" fontWeight="600" fill="#6E6E73" letterSpacing=".05em">CONVICTION</text>
    </svg>
  )
}

const SEVERITY_COLOR: Record<string, string> = {
  high: '#FF3B30',
  medium: '#FF9500',
  low: '#0066CC',
}

export default async function AuditResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getAudit(slug)
  if (!data) notFound()

  const a = data.audit

  return (
    <>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        a { text-decoration: none; }
      `}</style>

      <nav style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F' }}>IdeaByLunch</Link>
          <Link href="/audit" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500 }}>Audit another site</Link>
        </div>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '56px 24px 32px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Site audit</div>
        <h1 style={{ fontSize: 'clamp(36px,5.5vw,52px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2px', lineHeight: 1.05, margin: '0 0 16px' }}>
          {data.domain}
        </h1>
        <a href={data.url} target="_blank" rel="noreferrer noopener" style={{ fontSize: 14, color: '#0066CC', fontWeight: 500 }}>{data.url} ↗</a>
      </div>

      {/* Score + verdict */}
      <div style={{ maxWidth: 880, margin: '0 auto 32px', padding: '0 24px' }}>
        <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '36px 40px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', gap: 36, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flexShrink: 0 }}><ScoreRing score={a.convictionScore} /></div>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FF3B30', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>Verdict</div>
            <p style={{ fontSize: 22, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.5px', lineHeight: 1.35, margin: '0 0 14px' }}>{a.oneSentenceVerdict}</p>
            <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>{a.summary}</p>
          </div>
        </div>
      </div>

      {/* Share */}
      <div style={{ maxWidth: 880, margin: '0 auto 32px', padding: '0 24px' }}>
        <ShareButtons domain={data.domain} score={a.convictionScore} topFix={a.top3Fixes[0] || ''} slug={slug} />
      </div>

      {/* Top 3 fixes */}
      <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 14 }}>Top 3 fixes — ship today</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {a.top3Fixes.map((fix, i) => (
            <div key={i} style={{ background: '#1D1D1F', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#FF3B30', marginBottom: 8 }}>FIX 0{i + 1}</div>
              <div style={{ fontSize: 15, color: '#FFFFFF', fontWeight: 500, lineHeight: 1.4, letterSpacing: '-.1px' }}>{fix}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Problems */}
      <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 18px' }}>Problems we found</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {a.problems.map((p) => (
            <div key={p.rank} style={{ background: '#FFFFFF', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#AEAEB2', minWidth: 24 }}>#{p.rank}</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.2px', flex: 1 }}>{p.title}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#FFFFFF', background: SEVERITY_COLOR[p.severity] || '#AEAEB2', padding: '3px 8px', borderRadius: 5, letterSpacing: '.04em', textTransform: 'uppercase' }}>{p.severity}</span>
              </div>
              <p style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.55, margin: '0 0 8px' }}><strong style={{ color: '#1D1D1F' }}>Evidence:</strong> {p.evidence}</p>
              <p style={{ fontSize: 14, color: '#0066CC', lineHeight: 1.55, margin: 0, fontWeight: 500 }}><strong>Fix:</strong> {p.fix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rewrite */}
      <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 18px' }}>Your hero, rewritten</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          <div style={{ background: '#F2F2F7', borderRadius: 14, padding: '24px', border: '0.5px dashed rgba(0,0,0,.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Current</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#6E6E73', letterSpacing: '-.7px', lineHeight: 1.15, marginBottom: 10 }}>{data.current.h1 || data.current.title || '(no H1 detected)'}</div>
            <div style={{ fontSize: 14, color: '#AEAEB2', lineHeight: 1.5 }}>{data.current.description || '(no meta description)'}</div>
          </div>
          <div style={{ background: '#1D1D1F', borderRadius: 14, padding: '24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#30D158', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Proposed</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-.7px', lineHeight: 1.15, marginBottom: 10 }}>{a.rewrite.h1}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.5, marginBottom: 14 }}>{a.rewrite.sub}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ background: '#0066CC', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>{a.rewrite.primaryCta}</div>
              <div style={{ background: 'rgba(255,255,255,.1)', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500 }}>{a.rewrite.secondaryCta}</div>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>{a.rewrite.microcopy}</div>
          </div>
        </div>
      </div>

      {/* Tier rename */}
      {a.tierRename.length > 0 && (
        <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 18px' }}>Pricing reframed</h2>
          <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
            {a.tierRename.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16, padding: '16px 24px', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,.06)' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>From</div>
                  <div style={{ fontSize: 16, color: '#6E6E73', fontWeight: 500, textDecoration: 'line-through' }}>{t.from}</div>
                </div>
                <div style={{ fontSize: 18, color: '#AEAEB2' }}>→</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0066CC', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>To · {t.tag}</div>
                  <div style={{ fontSize: 17, color: '#1D1D1F', fontWeight: 700, letterSpacing: '-.3px' }}>{t.to}</div>
                  <div style={{ fontSize: 13, color: '#6E6E73', lineHeight: 1.4, marginTop: 2 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ rewrite */}
      <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 18px' }}>FAQ — rewritten to overcome real objections</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {a.faqs.map((f, i) => (
            <details key={i} style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
              <summary style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <span>{f.q}</span>
                <span style={{ fontSize: 20, color: '#AEAEB2', fontWeight: 300, flexShrink: 0 }}>+</span>
              </summary>
              <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.6, margin: '12px 0 0' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Upsell */}
      <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '48px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,59,48,.6), transparent)' }} />
          <h2 style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1.2px', margin: '0 0 14px', lineHeight: 1.1 }}>Want this rewrite as ready-to-paste code?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', margin: '0 0 28px', lineHeight: 1.5, maxWidth: 480, marginInline: 'auto' }}>Get the hero, FAQ, JSON-LD, and pricing tier code as Next.js TSX patches you can paste straight into your repo. Plus a step-by-step implementation guide.</p>
          <UpgradeButton slug={slug} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid rgba(0,0,0,.08)', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#AEAEB2' }}>
          Audited {new Date(data.scrapedAt).toLocaleDateString('en-US', { dateStyle: 'long' })} · <Link href="/audit" style={{ color: '#0066CC' }}>Audit another site</Link>
        </div>
      </div>
    </>
  )
}
