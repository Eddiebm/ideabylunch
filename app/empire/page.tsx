export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getRedis } from '@/app/lib/redis'
import type { StoredAudit } from '@/app/api/audit/route'
import EmpireAuditButton from './EmpireAuditButton'

export const revalidate = 600 // 10-min ISR

export const metadata: Metadata = {
  title: 'The Empire — every app I run, audited weekly',
  description: 'I built and audit every product in my empire with my own tool. Live conviction scores, public, updated weekly. Watch the empire improve in public.',
  alternates: { canonical: '/empire' },
  openGraph: {
    title: 'The Empire — IdeaByLunch',
    description: 'Every app I run, audited weekly with my own tool. Public scores. Watch us improve in public.',
    url: 'https://ideabylunch.com/empire',
  },
}

// Edit this list to add/remove apps from the empire.
// tier: 'flagship' = one product getting the 90-day distribution push (only ONE)
//       'rotation' = up to 2 apps in active fortnightly maintenance + content cycling
//       'cargo'    = live + indexed but no active work
type Tier = 'flagship' | 'rotation' | 'cargo'

const EMPIRE: Array<{ domain: string; name: string; tagline: string; category: string; tier: Tier }> = [
  { domain: 'ideabylunch.com', name: 'IdeaByLunch', tagline: 'Become a founder by lunch', category: 'Founder activation', tier: 'flagship' },
  { domain: 'medos.health', name: 'MedOS', tagline: 'Clinical AI for African healthcare', category: 'Healthtech', tier: 'rotation' },
  { domain: 'ai-ceo.com', name: 'AI CEO', tagline: 'AI executive in your pocket', category: 'AI agent', tier: 'rotation' },
  { domain: 'ablavie.com', name: 'Ablavie', tagline: 'AI-powered consumer app', category: 'Consumer AI', tier: 'cargo' },
]

const TIER_META: Record<Tier, { label: string; sublabel: string; color: string }> = {
  flagship:  { label: 'Flagship',  sublabel: '90-day distribution push · all-in',                color: '#0066CC' },
  rotation:  { label: 'Rotation',  sublabel: 'Fortnightly focus · maintenance + weekly content', color: '#FF9500' },
  cargo:     { label: 'Cargo',     sublabel: 'Live · indexed · no active work right now',         color: '#6E6E73' },
}

function slugFromDomain(domain: string): string {
  return domain.replace(/^www\./, '').replace(/\./g, '-').toLowerCase()
}

async function getEmpireData() {
  const redis = getRedis()
  const enrich = async (app: typeof EMPIRE[number]) => {
    const slug = slugFromDomain(app.domain)
    if (!redis) return { ...app, audit: null, slug }
    const raw = await redis.get<StoredAudit | string>(`audit:${slug}`)
    if (!raw) return { ...app, audit: null, slug }
    const cached: StoredAudit = typeof raw === 'string' ? JSON.parse(raw) : raw
    return { ...app, audit: cached, slug }
  }

  const all = await Promise.all(EMPIRE.map(enrich))

  return {
    flagship:  all.filter(a => a.tier === 'flagship'),
    rotation:  all.filter(a => a.tier === 'rotation'),
    cargo:     all.filter(a => a.tier === 'cargo'),
    all,
  }
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 75 ? '#30D158' : score >= 50 ? '#FF9500' : '#FF3B30'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 36, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-1.2px', fontVariantNumeric: 'tabular-nums' }}>{score}</span>
      <span style={{ fontSize: 14, color: '#6E6E73', fontWeight: 500 }}>/100</span>
    </div>
  )
}

type EnrichedApp = Awaited<ReturnType<typeof getEmpireData>>['all'][number]

function EmpireCard({ app }: { app: EnrichedApp }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '24px 26px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0066CC', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>{app.category}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', margin: '0 0 4px' }}>{app.name}</h2>
          <p style={{ fontSize: 14, color: '#6E6E73', margin: '0 0 6px', lineHeight: 1.45 }}>{app.tagline}</p>
          <a href={`https://${app.domain}`} target="_blank" rel="noreferrer noopener" style={{ fontSize: 13, color: '#0066CC', fontWeight: 500 }}>{app.domain} ↗</a>
        </div>
      </div>

      {app.audit ? (
        <>
          <div style={{ borderTop: '0.5px solid rgba(0,0,0,.08)', paddingTop: 14 }}>
            <ScoreBadge score={app.audit.audit.convictionScore} />
            <p style={{ fontSize: 13, color: '#6E6E73', margin: '8px 0 0', lineHeight: 1.5 }}>{app.audit.audit.oneSentenceVerdict}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
            <span style={{ fontSize: 11, color: '#AEAEB2' }}>
              Audited {new Date(app.audit.scrapedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <Link href={`/audit/${app.slug}`} style={{ fontSize: 13, color: '#0066CC', fontWeight: 600 }}>
              Read the report →
            </Link>
          </div>
        </>
      ) : (
        <div style={{ borderTop: '0.5px solid rgba(0,0,0,.08)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: '#AEAEB2', margin: 0, fontStyle: 'italic' }}>Audit pending</p>
          <EmpireAuditButton url={`https://${app.domain}`} />
        </div>
      )}
    </div>
  )
}

function TierSection({ tier, apps }: { tier: Tier; apps: EnrichedApp[] }) {
  if (apps.length === 0) return null
  const meta = TIER_META[tier]
  return (
    <div style={{ maxWidth: 880, margin: '0 auto 32px', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14, paddingLeft: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, letterSpacing: '.08em', textTransform: 'uppercase' }}>{meta.label}</span>
        <span style={{ fontSize: 13, color: '#AEAEB2', fontWeight: 500 }}>· {meta.sublabel}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 14 }}>
        {apps.map(app => <EmpireCard key={app.domain} app={app} />)}
      </div>
    </div>
  )
}

export default async function EmpirePage() {
  const data = await getEmpireData()
  const audited = data.all.filter(a => a.audit)
  const avg = audited.length > 0
    ? Math.round(audited.reduce((s, a) => s + a.audit!.audit.convictionScore, 0) / audited.length)
    : null

  return (
    <>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        a { text-decoration: none; }
        @keyframes pulseDot { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .55; transform: scale(.85) } }
      `}</style>

      <nav style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F' }}>IdeaByLunch</Link>
          <Link href="/audit" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500 }}>Audit your site</Link>
        </div>
      </nav>

      {/* Header */}
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 24px 32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1D1D1F', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '.04em', textTransform: 'uppercase' }}>Live · Updated weekly</span>
        </div>
        <h1 style={{ fontSize: 'clamp(40px,7vw,68px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2.5px', lineHeight: 1.05, margin: '0 0 20px' }}>
          The empire.
        </h1>
        <p style={{ fontSize: 18, color: '#6E6E73', lineHeight: 1.55, maxWidth: 580, margin: '0 auto 16px' }}>
          Every product I run, audited every week with my own tool. Public scores. No hiding the regressions. Watch us improve in public.
        </p>
        {avg !== null && (
          <p style={{ fontSize: 14, color: '#0066CC', fontWeight: 600, margin: 0 }}>
            Average conviction across {audited.length} live audits: <strong>{avg}/100</strong>
          </p>
        )}
      </div>

      {/* Empire grid — grouped by tier */}
      <div style={{ paddingTop: 24, paddingBottom: 32 }}>
        <TierSection tier="flagship" apps={data.flagship} />
        <TierSection tier="rotation" apps={data.rotation} />
        <TierSection tier="cargo" apps={data.cargo} />
      </div>

      {/* Founder note */}
      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#30D158', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>Founder&apos;s note</div>
          <p style={{ fontSize: 18, fontWeight: 500, color: '#FFFFFF', lineHeight: 1.5, letterSpacing: '-.2px', margin: '0 0 20px' }}>
            I run all of these. I audit them weekly with my own tool. Sometimes the score goes up. Sometimes it goes down. I show the regressions because hiding them would make this list a sales page. It&apos;s not. It&apos;s a receipt.
          </p>
          <Link href="/audit" style={{ background: '#0066CC', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 600, display: 'inline-block' }}>
            Audit your site →
          </Link>
        </div>
      </div>
    </>
  )
}
