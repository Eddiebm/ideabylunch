export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'
import AuditForm from './AuditForm'

export const metadata: Metadata = {
  title: 'Free Site Audit · Brutal honesty in 60 seconds',
  description: 'Paste any landing page. Get a brutal, founder-grade audit + a rewritten hero, FAQ, and pricing tiers. Free. No signup.',
  alternates: { canonical: '/audit' },
  openGraph: {
    title: 'Free Site Audit — IdeaByLunch',
    description: 'Brutal honesty + a rewritten landing page. Free, in 60 seconds.',
    url: 'https://ideabylunch.com/audit',
    type: 'website',
  },
}

export default function AuditLandingPage() {
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
          <Link href="/app" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500 }}>Cook my idea</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px 32px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,.08)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B30', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>Brutal honesty · Free · 60 seconds</span>
        </div>

        <h1 style={{ fontSize: 'clamp(40px,7vw,68px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2.5px', lineHeight: 1.05, margin: '0 0 20px' }}>
          Your landing page<br /><span style={{ color: '#FF3B30' }}>is leaking founders.</span>
        </h1>

        <p style={{ fontSize: 19, color: '#6E6E73', lineHeight: 1.5, maxWidth: 580, margin: '0 auto 36px' }}>
          Paste any URL. Get a 10-point conviction audit, a rewritten hero, a new FAQ, and pricing tiers reframed as outcomes — in 60 seconds. Free.
        </p>

        <AuditForm />

        <p style={{ fontSize: 13, color: '#AEAEB2', margin: '20px 0 0', fontWeight: 500 }}>
          No signup. Result page is public + indexable. 3 free audits per day.
        </p>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto 80px', padding: '32px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { title: '10-point audit', body: 'Identity collapse, agency framing, dead pricing, orphan pages, missing wow moment — ranked by leverage.' },
            { title: 'Rewritten hero', body: 'A new H1, sub, and CTA built around the transformation, not the feature list.' },
            { title: 'New FAQ + JSON-LD', body: 'Six conviction-blocking questions written to overcome real objections, not filler.' },
            { title: 'Pricing reframed', body: 'Tier names rewritten as outcomes (Launch / Growth / Scale / Venture), not service tiers.' },
            { title: 'Top 3 fixes', body: 'A ranked queue you can ship today. Not a 60-page deliverable nobody reads.' },
            { title: 'Conviction score', body: 'Single number, 0–100, that tells you whether your homepage converts strangers.' },
          ].map(c => (
            <div key={c.title} style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.2px', marginBottom: 6 }}>{c.title}</div>
              <p style={{ fontSize: 13, color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
