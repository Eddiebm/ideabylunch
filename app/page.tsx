export const runtime = 'edge'
import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveMarket, MARKET_PRICING } from './lib/pricing'
import FunnelBeacon from './components/FunnelBeacon'

async function getDeployCount(): Promise<number> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${base}/api/stats`, { next: { revalidate: 60 }, signal: ctrl.signal })
    clearTimeout(t)
    const data = await res.json()
    return data.deploys || 0
  } catch { return 0 }
}

const FAQS = [
  {
    q: 'Is this just a website?',
    a: 'No. The site is only the front door. IdeaByLunch also gives you the structure, onboarding flows, lead capture, admin tools, analytics, and growth recommendations needed to operate the marketplace.',
  },
  {
    q: 'Can I edit the marketplace after launch?',
    a: 'Yes. The system supports simple updates to copy, categories, listings, and core content. You own the code and can modify anything.',
  },
  {
    q: 'Do you handle payments?',
    a: 'We build the site payment-ready. Actual payment processor setup may require Stripe or another provider depending on your marketplace model.',
  },
  {
    q: 'Who is this best for?',
    a: 'Founders testing service marketplaces, local directories, vendor networks, rental platforms, expert marketplaces, and niche B2B marketplaces.',
  },
  {
    q: 'Why not use Wix, Lovable, Bolt, or Base44?',
    a: 'Those tools can help generate websites or apps. IdeaByLunch is focused specifically on marketplace launch and growth workflows — seller onboarding, buyer capture, liquidity mechanics, and an AI coach that tells you what to do next.',
  },
  {
    q: 'What happens after launch?',
    a: 'The Growth OS helps identify the next practical actions: recruit sellers, improve listings, capture buyers, follow up with leads, and test monetisation. You get a weekly action plan tailored to where your marketplace is right now.',
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. We deliver a live, deployed marketplace. You also get a master build prompt — drop it into Claude Code, Cursor, or Codex if you want to keep building.',
  },
  {
    q: 'Who owns the code and the domain?',
    a: 'You. 100%. The Vercel project, the GitHub repo, the domain registration — all transferred to you. No lock-in, no licence fee, no vendor moat.',
  },
] as const

const WHAT_YOU_GET = [
  ['Marketplace website', true],
  ['Seller onboarding', true],
  ['Buyer lead capture', true],
  ['Listing templates', true],
  ['SEO-ready pages', true],
  ['Analytics dashboard', true],
  ['AI growth recommendations', true],
  ['Weekly action plan', true],
  ['Payment readiness', true],
  ['Admin dashboard', true],
] as const

const COMPARISON = [
  ['Builds pages', true, true],
  ['Understands marketplaces', false, true],
  ['Creates seller flow', false, true],
  ['Creates buyer flow', false, true],
  ['Suggests next actions', false, true],
  ['Helps with liquidity', false, true],
  ['Tracks marketplace growth', false, true],
  ['Acts like AI co-founder', false, true],
] as const

const WHO_ITS_FOR = [
  { icon: '🛎️', label: 'Service marketplaces' },
  { icon: '📍', label: 'Local business directories' },
  { icon: '🏠', label: 'Rental marketplaces' },
  { icon: '🧠', label: 'Expert networks' },
  { icon: '🏪', label: 'Vendor directories' },
  { icon: '👥', label: 'Community marketplaces' },
  { icon: '🤝', label: 'Niche B2B marketplaces' },
  { icon: '🎪', label: 'Event & vendor marketplaces' },
] as const

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ currency?: string }>
}) {
  const headersList = await headers()
  const sp = (await (searchParams ?? Promise.resolve({}))) as { market?: string }
  const deployCount = await getDeployCount()
  const country = headersList.get('x-vercel-ip-country')
  const marketCode = resolveMarket({ country, override: sp.market })
  const p = MARKET_PRICING[marketCode]
  const isUS = marketCode === 'US'
  const toggleHref = isUS ? '' : '/?market=US'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://ideabylunch.com/#org',
        name: 'IdeaByLunch',
        url: 'https://ideabylunch.com',
        logo: 'https://ideabylunch.com/opengraph-image',
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': 'https://ideabylunch.com/#site',
        url: 'https://ideabylunch.com',
        name: 'IdeaByLunch',
        publisher: { '@id': 'https://ideabylunch.com/#org' },
      },
      {
        '@type': 'Product',
        name: 'IdeaByLunch — AI Marketplace Launch + Growth OS',
        description: 'Launch your marketplace by lunch. Grow it every day after.',
        brand: { '@id': 'https://ideabylunch.com/#org' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: '299',
          availability: 'https://schema.org/InStock',
          url: 'https://ideabylunch.com',
        },
      },
      {
        '@type': 'HowTo',
        name: 'How to launch a marketplace by lunch',
        description: 'Three steps from idea to live marketplace business.',
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Tell us the idea', text: 'Plain English description of the marketplace, target users, location, niche, and monetisation idea.' },
          { '@type': 'HowToStep', position: 2, name: 'We launch the system', text: 'We generate the marketplace structure, pages, copy, listings framework, onboarding flows, and launch dashboard.' },
          { '@type': 'HowToStep', position: 3, name: 'Your AI growth coach helps you move', text: 'After launch, the system recommends what to do next: recruit sellers, improve listings, follow up with buyers, test pricing, and create marketing content.' },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <>
      <FunnelBeacon step="idea_viewed" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,700;0,800;1,700;1,800&family=DM+Sans:wght@400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulseDot { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .55; transform: scale(.85) } }
        @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F8F7F4; font-family: 'DM Sans', system-ui, sans-serif; }
        a { text-decoration: none; }
        .ticker-track { display: flex; gap: 32px; animation: ticker 40s linear infinite; white-space: nowrap; }
        .solution-row { display: grid; grid-template-columns: 48px 200px 1fr; gap: 0 24px; }
        @media (max-width: 680px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: repeat(2,1fr) !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .comparison-table { font-size: 13px !important; }
          .nav-links { display: none !important; }
          .solution-row { grid-template-columns: 36px 1fr !important; }
          .solution-row span:last-child { grid-column: 2 / -1; }
        }
      `}</style>

      <div style={{ background: '#F8F7F4', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,.08)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 17, fontWeight: 800, color: '#111111', letterSpacing: '-.4px', textDecoration: 'none' }}>
              IdeaByLunch
            </Link>
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <a href="#how" style={{ fontSize: 14, color: '#5A5A5A', fontWeight: 500 }}>How it works</a>
              <a href="#pricing" style={{ fontSize: 14, color: '#5A5A5A', fontWeight: 500 }}>Pricing</a>
              <Link href="/gallery" style={{ fontSize: 14, color: '#5A5A5A', fontWeight: 500 }}>Examples</Link>
              <Link href="/refer" style={{ fontSize: 14, color: '#5A5A5A', fontWeight: 500 }}>Refer & earn</Link>
              {!isUS && (
                <a href={toggleHref} style={{ fontSize: 12, color: '#5A5A5A', fontWeight: 500, border: '1px solid rgba(0,0,0,.12)', borderRadius: 6, padding: '4px 8px' }}>
                  {p.flag} {marketCode} → USD
                </a>
              )}
              <Link href="/app" style={{ background: '#111111', color: '#FFFFFF', borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, letterSpacing: '-.1px', textDecoration: 'none' }}>
                Start →
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Ticker ───────────────────────────────────────────────────── */}
        {/* ── Ticker ───────────────────────────────────────────────────── */}
        <div style={{ background: '#111111', overflow: 'hidden', height: 36, display: 'flex', alignItems: 'center' }}>
          <div className="ticker-track">
            {Array.from({ length: 2 }).map((_, repeat) => (
              <div key={repeat} style={{ display: 'flex', gap: 48, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.65)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {deployCount > 0 ? `${deployCount.toLocaleString()} marketplaces launched` : 'AI Marketplace Builder'}
                </span>
                <span style={{ color: '#C8511A' }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.65)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Sellers · Buyers · Growth</span>
                <span style={{ color: '#C8511A' }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.65)', letterSpacing: '.06em', textTransform: 'uppercase' }}>You own the code</span>
                <span style={{ color: '#C8511A' }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.65)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Brief is always free</span>
                <span style={{ color: '#C8511A' }}>·</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '100px 24px 96px', animation: 'fadeUp .5s ease both' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>
              AI Marketplace Launch + Growth OS
            </span>
          </div>
          <h1 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(40px, 7vw, 76px)', fontWeight: 800, color: '#111111', letterSpacing: '-2px', lineHeight: 1.0, margin: '0 0 28px', maxWidth: 760 }}>
            Your marketplace idea,<br />
            live <em style={{ color: '#C8511A', fontStyle: 'italic' }}>by lunch.</em>
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2.5vw, 20px)', color: '#5A5A5A', lineHeight: 1.65, margin: '0 0 40px', maxWidth: 540 }}>
            Brief your marketplace in plain English. We generate the full system — pages, seller flows, buyer capture, analytics, and an AI coach that tells you what to do next.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/app" style={{ background: '#111111', color: '#FFFFFF', borderRadius: 10, padding: '15px 32px', fontSize: 16, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block', textDecoration: 'none' }}>
              Cook my idea →
            </Link>
            <a href="#how" style={{ color: '#5A5A5A', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}>
              See how it works ↓
            </a>
          </div>
          {!isUS && (
            <div style={{ marginTop: 20 }}>
              <span style={{ fontSize: 13, color: '#5A5A5A' }}>
                Pricing shown in {p.currency} · <a href={toggleHref} style={{ color: '#C8511A', fontWeight: 500, textDecoration: 'none' }}>Switch to USD</a>
              </span>
            </div>
          )}
        </div>

        {/* ── Problem ──────────────────────────────────────────────────── */}
        <div id="problem" style={{ maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>The pattern</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 0', lineHeight: 1.1 }}>
              Why most marketplace ideas never launch.
            </h2>
          </div>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              { n: '01', label: 'Nothing moves', desc: 'You have the idea. The build never starts. The right moment never comes. The window closes.' },
              { n: '02', label: 'Ghost marketplace', desc: "You build it, but nobody comes. No sellers. No buyers. No transactions. Just a beautiful empty page." },
              { n: '03', label: 'Confused sellers', desc: "The few who find you don't list. No clear steps. No onboarding. No reason to believe it's worth joining." },
              { n: '04', label: 'No direction after day one', desc: "The site is live. Now what? You don't know who to recruit, what to fix, or how to generate momentum." },
            ].map((item, i) => (
              <div key={item.n} style={{ padding: '32px', borderTop: '1px solid rgba(0,0,0,.09)', borderRight: i % 2 === 0 ? '1px solid rgba(0,0,0,.09)' : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#C8511A', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>{item.n}</div>
                <div style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 18, fontWeight: 700, color: '#111111', letterSpacing: '-.3px', marginBottom: 10, lineHeight: 1.2 }}>{item.label}</div>
                <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Solution ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>What we build</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 0', lineHeight: 1.1 }}>
              Everything your marketplace needs to open.
            </h2>
          </div>
          <div style={{ borderTop: '1px solid rgba(0,0,0,.09)' }}>
            {[
              { n: '01', label: 'Marketplace structure', desc: 'The pages, sections, and navigation that make a marketplace legible to both sides of the network.' },
              { n: '02', label: 'Sales copywriting', desc: 'Headline, subheads, features, pricing copy, and trust-building language written for your specific niche.' },
              { n: '03', label: 'Seller onboarding', desc: 'A guided setup flow so first sellers know exactly how to list, what to include, and what to expect.' },
              { n: '04', label: 'Buyer lead capture', desc: 'Forms, landing pages, and conversion flows to capture buyers from day one.' },
              { n: '05', label: 'Listings framework', desc: 'A structured system for categories, filters, and listing formats relevant to your marketplace type.' },
              { n: '06', label: 'SEO-ready pages', desc: 'Title tags, meta descriptions, and semantic markup targeting the searches your marketplace should own.' },
              { n: '07', label: 'Analytics dashboard', desc: 'Seller counts, buyer leads, listing health, and conversion metrics in one view.' },
              { n: '08', label: 'AI growth recommendations', desc: 'Weekly action plans based on your marketplace data — who to recruit, what to fix, how to grow.' },
              { n: '09', label: 'Payment readiness', desc: 'Stripe-ready infrastructure. Start collecting revenue from launch day.' },
            ].map(item => (
              <div key={item.n} className="solution-row" style={{ padding: '20px 0', borderBottom: '1px solid rgba(0,0,0,.07)', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#C8511A', letterSpacing: '.06em', textTransform: 'uppercase' }}>{item.n}</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#111111', letterSpacing: '-.2px' }}>{item.label}</span>
                <span style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.6 }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <div id="how" style={{ maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>How it works</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 0', lineHeight: 1.1 }}>
              Idea → System → Growth. By lunch.
            </h2>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'rgba(0,0,0,.09)' }}>
            {[
              {
                step: '01',
                title: 'Tell us the idea',
                body: 'Plain English description of the marketplace, target users, location, niche, and monetisation idea. One sentence or ten.',
              },
              {
                step: '02',
                title: 'We launch the system',
                body: 'We generate the marketplace structure, pages, copy, listings framework, onboarding flows, and launch dashboard.',
              },
              {
                step: '03',
                title: 'Your AI growth coach helps you move',
                body: 'After launch, the system recommends what to do next: recruit sellers, improve listings, follow up with buyers, test pricing, and create marketing content.',
              },
            ].map(s => (
              <div key={s.step} style={{ background: '#F8F7F4', padding: '32px 28px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#C8511A', marginBottom: 16, letterSpacing: '.06em', textTransform: 'uppercase' }}>Step {s.step}</div>
                <div style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 18, fontWeight: 700, color: '#111111', letterSpacing: '-.3px', marginBottom: 12, lineHeight: 1.2 }}>{s.title}</div>
                <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.65, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── What You Actually Get ─────────────────────────────────────── */}
        <div id="what-you-get" style={{ maxWidth: 680, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>What&apos;s included</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>
              What you actually get.
            </h2>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
              <div style={{ padding: '14px 24px', fontSize: 13, fontWeight: 700, color: '#6E6E73', letterSpacing: '.04em', textTransform: 'uppercase' }}>Feature</div>
              <div style={{ padding: '14px 24px', fontSize: 13, fontWeight: 700, color: '#6E6E73', letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'center' }}>Included</div>
            </div>
            {WHAT_YOU_GET.map(([feature, included], i) => (
              <div key={feature} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', borderBottom: i < WHAT_YOU_GET.length - 1 ? '0.5px solid rgba(0,0,0,.05)' : 'none', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                <div style={{ padding: '14px 24px', fontSize: 15, color: '#1D1D1F', fontWeight: 500 }}>{feature}</div>
                <div style={{ padding: '14px 24px', textAlign: 'center' }}>
                  {included
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: '#30D158' }}><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                    : <span style={{ color: '#AEAEB2' }}>—</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── AI Growth Dashboard Preview ───────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 40 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>Growth OS</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 8px', lineHeight: 1.1 }}>
              Your AI growth dashboard.
            </h2>
            <p style={{ fontSize: 17, color: '#5A5A5A', margin: 0, maxWidth: 440, lineHeight: 1.6 }}>
              After launch, this is what you wake up to every morning.
            </p>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,.08)', boxShadow: '0 8px 32px rgba(0,0,0,.08)' }}>
            <div style={{ background: '#111111', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C8511A', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', letterSpacing: '-.1px' }}>Today&apos;s Marketplace Health</span>
              </div>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontWeight: 500, letterSpacing: '.03em', textTransform: 'uppercase' }}>Live · Updated now</span>
            </div>
            <div style={{ padding: '24px' }}>
              <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Sellers', value: '14', trend: '+3 this week' },
                  { label: 'Buyers', value: '38', trend: '+12 this week' },
                  { label: 'Listings', value: '62', trend: '+8 this week' },
                  { label: 'Leads', value: '11', trend: '+5 this week' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#F8F7F4', borderRadius: 10, padding: '16px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#5A5A5A', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</div>
                    <div style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 28, fontWeight: 800, color: '#111111', letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: '#5A5A5A', fontWeight: 500 }}>{stat.trend}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#F8F7F4', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111111', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Recommended actions this week
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { priority: 'High', text: "Contact 5 inactive sellers — 3 haven't listed in 7 days", tag: 'Seller activation' },
                    { priority: 'High', text: 'Add 10 more listings in your strongest category', tag: 'Inventory' },
                    { priority: 'Medium', text: 'Send follow-up email to new buyer leads from this week', tag: 'Buyer nurture' },
                    { priority: 'Medium', text: 'Test a featured listing offer to increase transaction rate', tag: 'Monetisation' },
                    { priority: 'Low', text: 'Publish one local SEO page targeting your top search term', tag: 'Discovery' },
                  ].map((action, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid rgba(0,0,0,.07)' : 'none' }}>
                      <div style={{ flexShrink: 0, marginTop: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: action.priority === 'High' ? '#C8511A' : action.priority === 'Medium' ? '#E8A020' : '#5A5A5A' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: '#111111', fontWeight: 500, lineHeight: 1.4 }}>{action.text}</div>
                        <div style={{ fontSize: 12, color: '#5A5A5A', marginTop: 2 }}>{action.tag}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#888', marginTop: 14, lineHeight: 1.5 }}>This is a preview — your live dashboard reflects your actual marketplace data.</p>
        </div>

        {/* ── Who It&apos;s For ────────────────────────────────────────────── */}
        <div style={{ maxWidth: 900, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 36 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>Built for</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 0', lineHeight: 1.1 }}>
              Who it&apos;s for.
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {WHO_ITS_FOR.map(item => (
              <div key={item.label} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,.09)', borderRadius: 8, padding: '12px 20px', fontSize: 15, fontWeight: 500, color: '#111111', letterSpacing: '-.1px' }}>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison ───────────────────────────────────────────────── */}
        <div style={{ maxWidth: 720, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 40 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>Why not just use a website builder?</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 0', lineHeight: 1.1 }}>
              Not just a website builder.
            </h2>
          </div>
          <div className="comparison-table" style={{ background: '#FFFFFF', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,.08)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', borderBottom: '1px solid rgba(0,0,0,.08)' }}>
              <div style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#5A5A5A', letterSpacing: '.06em', textTransform: 'uppercase' }}>Capability</div>
              <div style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#5A5A5A', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'center' }}>Website Builder</div>
              <div style={{ padding: '12px 20px', fontSize: 12, fontWeight: 700, color: '#C8511A', letterSpacing: '.06em', textTransform: 'uppercase', textAlign: 'center' }}>IdeaByLunch</div>
            </div>
            {COMPARISON.map(([capability, competitor, us], i) => (
              <div key={capability} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', borderBottom: i < COMPARISON.length - 1 ? '1px solid rgba(0,0,0,.05)' : 'none', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAF8' }}>
                <div style={{ padding: '13px 20px', fontSize: 15, color: '#111111', fontWeight: 500 }}>{capability}</div>
                <div style={{ padding: '13px 20px', textAlign: 'center', fontSize: 14, color: competitor ? '#5A5A5A' : '#BBBBBB', fontWeight: competitor ? 500 : 400 }}>
                  {competitor ? 'Yes' : 'No'}
                </div>
                <div style={{ padding: '13px 20px', textAlign: 'center', fontSize: 14, color: us ? '#C8511A' : '#BBBBBB', fontWeight: us ? 600 : 400 }}>
                  {us ? 'Yes' : 'No'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <div id="pricing" style={{ maxWidth: 780, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 48 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>Pricing</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 8px', lineHeight: 1.1 }}>Simple. Founder-priced.</h2>
            <p style={{ fontSize: 17, color: '#5A5A5A', margin: 0, maxWidth: 400, lineHeight: 1.6 }}>Start with the launch. Add growth when you&apos;re ready.</p>
          </div>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 12 }}>
            {/* Launch Package */}
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: '32px 28px', border: '1px solid rgba(0,0,0,.08)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5A5A5A', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Launch Package</div>
              <div style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 48, fontWeight: 800, color: '#111111', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>{p.professional}</div>
              <div style={{ fontSize: 14, color: '#888', marginBottom: 28 }}>one-time setup</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                {[
                  'Marketplace launch system',
                  'Structure, pages & copy',
                  'Listings framework',
                  'Seller onboarding flow',
                  'Buyer lead capture',
                  'Admin setup',
                  'Live by lunch',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#C8511A', fontWeight: 700, flexShrink: 0, marginTop: 1, fontSize: 14 }}>→</span>
                    <span style={{ fontSize: 14, color: '#111111', lineHeight: 1.4 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/app" style={{ background: '#111111', color: '#FFFFFF', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                Launch today →
              </Link>
            </div>

            {/* Growth OS */}
            <div style={{ background: '#111111', borderRadius: 12, padding: '32px 28px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#C8511A', color: '#FFF', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', padding: '4px 14px', borderRadius: '0 0 7px 7px', whiteSpace: 'nowrap' }}>Most founders add this</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.45)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 12 }}>Growth OS</div>
              <div style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 48, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>{p.monthly}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', marginBottom: 28 }}>after launch · cancel anytime</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
                {[
                  'Hosting & infrastructure',
                  'Analytics dashboard',
                  'AI growth recommendations',
                  'Weekly action plan',
                  'Ongoing improvements',
                  'Seller & buyer metrics',
                  'Priority support',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#C8511A', fontWeight: 700, flexShrink: 0, marginTop: 1, fontSize: 14 }}>→</span>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', lineHeight: 1.4 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/app" style={{ background: '#FFFFFF', color: '#111111', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                Launch + Grow →
              </Link>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 10, padding: '16px 20px', border: '1px solid rgba(0,0,0,.08)', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#5A5A5A', margin: 0, lineHeight: 1.6 }}>
              Cancel anytime. Built for founders validating a real marketplace, not playing with templates.{' '}
              <span style={{ color: '#C8511A', fontWeight: 500 }}>Brief is always free — no card required to start.</span>
            </p>
          </div>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <div id="faq" style={{ maxWidth: 720, margin: '0 auto 100px', padding: '0 24px' }}>
          <div style={{ marginBottom: 40 }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#5A5A5A' }}>FAQ</span>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#111111', letterSpacing: '-1px', margin: '10px 0 0', lineHeight: 1.1 }}>The honest answers.</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {FAQS.map(f => (
              <details key={f.q} style={{ borderTop: '1px solid rgba(0,0,0,.08)', padding: '20px 0' }}>
                <summary style={{ fontSize: 16, fontWeight: 600, color: '#111111', letterSpacing: '-.2px', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <span>{f.q}</span>
                  <span style={{ fontSize: 18, color: '#C8511A', fontWeight: 400, flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ fontSize: 15, color: '#5A5A5A', lineHeight: 1.65, margin: '12px 0 0' }}>{f.a}</p>
              </details>
            ))}
            <div style={{ borderTop: '1px solid rgba(0,0,0,.08)' }} />
          </div>
        </div>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{ background: '#111111', borderRadius: 12, padding: '64px 40px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Libre Franklin', sans-serif", fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1.5px', margin: '0 0 14px', lineHeight: 1.1 }}>
              Your marketplace can be live by lunch.<br />
              <em style={{ color: '#C8511A', fontStyle: 'italic' }}>Or you can keep thinking about it.</em>
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.5)', margin: '0 0 36px', lineHeight: 1.6 }}>
              Brief in 60 seconds. System live within hours. You own everything.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/app" style={{ background: '#C8511A', color: '#FFFFFF', borderRadius: 8, padding: '16px 36px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block' }}>
                Cook my idea →
              </Link>
              <a href="#what-you-get" style={{ background: 'rgba(255,255,255,.1)', color: '#FFFFFF', borderRadius: 8, padding: '16px 28px', fontSize: 17, fontWeight: 500, letterSpacing: '-.2px', display: 'inline-block' }}>
                See what you get
              </a>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,.08)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <Link href="/audit" style={{ fontSize: 14, color: '#5A5A5A' }}>Free Site Audit</Link>
            <Link href="/empire" style={{ fontSize: 14, color: '#5A5A5A' }}>The Empire</Link>
            <Link href="/idea-generator" style={{ fontSize: 14, color: '#5A5A5A' }}>Free Idea Generator</Link>
            <Link href="/logo" style={{ fontSize: 14, color: '#5A5A5A' }}>Logo Generator</Link>
            <Link href="/gallery" style={{ fontSize: 14, color: '#5A5A5A' }}>Built by Lunch</Link>
            <Link href="/refer" style={{ fontSize: 14, color: '#5A5A5A' }}>Refer & earn</Link>
            <Link href="/terms" style={{ fontSize: 14, color: '#5A5A5A' }}>Terms</Link>
          </div>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>© 2026 IdeaByLunch · AI Marketplace Launch + Growth OS</p>
        </div>

      </div>
    </>
  )
}
