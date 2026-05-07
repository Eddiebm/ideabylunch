export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Free AI Startup Idea Generator',
  description: 'Generate validated startup ideas for any niche, market, or skill. Free, no signup. From IdeaByLunch — the fastest way to become a founder.',
  alternates: { canonical: '/idea-generator' },
  openGraph: {
    title: 'Free AI Startup Idea Generator — IdeaByLunch',
    description: 'Generate validated startup ideas for any niche. Free, no signup.',
    url: 'https://ideabylunch.com/idea-generator',
    type: 'website',
  },
}

const SEED_IDEAS = [
  { niche: 'AI for African SMBs', idea: 'WhatsApp-native bookkeeping bot for Lagos market traders. Reads receipts, files VAT, settles to mobile money.', why: 'High pain, low tech literacy assumed, daily usage moment, distribution = WhatsApp groups.' },
  { niche: 'Vertical SaaS', idea: 'Operations platform for African private clinics — patient records, billing, NHIS claims, lab results in one tab.', why: 'Existing systems are paper-based or Excel. Decision-maker is the GP, not IT. Sticky once installed.' },
  { niche: 'Creator economy', idea: 'AI ghostwriter that turns voice notes into LinkedIn posts in your specific tone, with 6 months of post archive as training.', why: 'LinkedIn is the highest-LTV creator surface. Voice → text removes the blank-page tax.' },
  { niche: 'Fintech', idea: 'Stripe-on-top-of-Paystack: a US-developer-friendly API that abstracts African payment rails so US founders can accept African customers.', why: 'Massive arbitrage between African TAM and US dev tooling. Distribution: dev rel + Twitter.' },
  { niche: 'B2B AI agents', idea: 'AI sales-call follow-up that drafts 3 personalised outreach emails per call within 5 minutes of hangup.', why: 'Salespeople hate writing follow-ups. Pricing: per-seat $99/mo. Distribution: Outreach + Apollo integrations.' },
  { niche: 'Healthtech', idea: 'Asthma-inhaler companion app that uses phone mic to detect inhaler clicks, logs adherence, alerts pharmacist when low.', why: 'Adherence is the #1 unsolved problem in chronic respiratory care. Sell to pharmacy chains, not patients.' },
  { niche: 'Edtech', idea: 'WAEC/JAMB cram tutor that lets Ghanaian and Nigerian students upload past papers and gets explained answers in pidgin.', why: 'Massive WhatsApp-distributable user base. Cultural specificity is the moat.' },
  { niche: 'Climate', idea: 'Solar-payback calculator + financing marketplace for West African homeowners. Inputs grid hours/day, outputs ROI in months.', why: 'Diesel cost is the marketing. SMS-first delivery for low-bandwidth users.' },
  { niche: 'Agency replacement', idea: 'AI that rewrites a SaaS landing page weekly based on the previous week&apos;s ad spend + conversion data.', why: 'Marketing teams burn agency retainers on copy. CRO compounds. Sticky workflow.' },
  { niche: 'Vibe coding', idea: 'Cursor extension that auto-generates a master build prompt from any GitHub repo so other AIs can extend it.', why: 'Distribution: Cursor extension marketplace. Ride the wave.' },
  { niche: 'Marketplace', idea: 'Vetted-AI-engineer marketplace for African startups — pre-screened, paid in stablecoin, project-based.', why: 'Africa has the talent, lacks the deal flow + payment rails. Two-sided wedge.' },
  { niche: 'Sports / Africa', idea: 'Match-day commerce platform that lets Ghana Premier League fans pre-order food + merch from their seat.', why: 'Stadium concessions are broken everywhere. Start with one club, expand by league.' },
] as const

export default function IdeaGeneratorPage() {
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
          <Link href="/app" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500 }}>Cook my idea</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '72px 24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#0066CC', marginBottom: 14 }}>Free · no signup</div>
        <h1 style={{ fontSize: 'clamp(40px,7vw,68px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2.5px', lineHeight: 1.05, margin: '0 0 20px' }}>
          AI Startup Idea Generator
        </h1>
        <p style={{ fontSize: 19, color: '#6E6E73', lineHeight: 1.5, maxWidth: 580, margin: '0 auto 32px' }}>
          12 hand-picked, validated startup ideas for 2026. Each with the niche, the wedge, and why it works. Steal one and ship it.
        </p>
        <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 12, padding: '14px 28px', fontSize: 17, fontWeight: 600, display: 'inline-block', boxShadow: '0 4px 16px rgba(0,102,204,.25)' }}>
          Cook my own idea →
        </Link>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 24px 80px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
        {SEED_IDEAS.map(s => (
          <div key={s.idea} style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0066CC', letterSpacing: '.06em', textTransform: 'uppercase' }}>{s.niche}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.2px', lineHeight: 1.35 }}>{s.idea}</div>
            <div style={{ fontSize: 13, color: '#6E6E73', lineHeight: 1.5 }}><strong style={{ color: '#1D1D1F' }}>Why it works:</strong> {s.why}</div>
            <Link href={`/app?seed=${encodeURIComponent(s.idea)}`} style={{ marginTop: 'auto', fontSize: 13, color: '#0066CC', fontWeight: 600 }}>
              Cook this idea →
            </Link>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '48px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-1.2px', margin: '0 0 12px', lineHeight: 1.15 }}>None of these is your idea?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', margin: '0 0 24px', lineHeight: 1.5 }}>
            Type your own. We&apos;ll generate the brief, the ICP, the GTM, and a live business — by lunch.
          </p>
          <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 600, display: 'inline-block' }}>
            Cook my idea — free →
          </Link>
        </div>
      </div>
    </>
  )
}
