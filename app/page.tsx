export const runtime = 'edge'
import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveMarket, MARKET_PRICING } from './lib/pricing'

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulseDot { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .55; transform: scale(.85) } }
        @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; }
        a { text-decoration: none; }
        .ticker-track { display: flex; gap: 32px; animation: ticker 40s linear infinite; white-space: nowrap; }
        @media (max-width: 680px) {
          .hero-headline { font-size: 42px !important; letter-spacing: -1.5px !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: repeat(2,1fr) !important; }
          .hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .hero-btns a { text-align: center !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .comparison-table { font-size: 13px !important; }
          .nav-links { display: none !important; }
          .section-pad { padding: 64px 20px !important; }
        }
      `}</style>

      <div style={{ background: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)' }}>
          <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px' }}>IdeaByLunch</div>
            <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <a href="#problem" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>Why it matters</a>
              <a href="#how" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>How it works</a>
              <a href="#pricing" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>Pricing</a>
              <Link href="/grow" style={{ fontSize: 14, color: '#30D158', fontWeight: 600 }}>Grow</Link>
              <Link href="/refer" style={{ fontSize: 14, color: '#0066CC', fontWeight: 600 }}>Refer & earn</Link>
              <a href="#faq" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>FAQ</a>
              {!isUS && (
                <a href={toggleHref} style={{ fontSize: 12, color: '#6E6E73', fontWeight: 500, border: '0.5px solid rgba(0,0,0,.15)', borderRadius: 6, padding: '4px 8px' }}>
                  {p.flag} {marketCode} → USD
                </a>
              )}
              <Link href="/app" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, letterSpacing: '-.1px' }}>
                Cook my idea
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Ticker ───────────────────────────────────────────────────── */}
        <div style={{ background: '#1D1D1F', padding: '10px 0', marginTop: 52, overflow: 'hidden' }}>
          <div className="ticker-track">
            {Array.from({ length: 2 }).map((_, repeat) => (
              <div key={repeat} style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#30D158', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
                  <strong style={{ color: '#30D158' }}>{deployCount.toLocaleString()}</strong> marketplaces launched · live counter
                </span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>You own the code, the domain, the customers</span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Seller onboarding · Buyer capture · AI growth coach</span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Brief free. Always.</span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '88px 24px 64px', textAlign: 'center', animation: 'fadeUp .6s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,.08)', borderRadius: 100, padding: '6px 16px', marginBottom: 28, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>AI Marketplace Launch + Growth OS · live now</span>
          </div>

          <h1 className="hero-headline" style={{ fontSize: 'clamp(42px,7.5vw,78px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-3px', lineHeight: 1.0, margin: '0 0 24px' }}>
            Launch your marketplace<br />
            <span style={{ color: '#0066CC' }}>by lunch.</span><br />
            <span style={{ color: '#1D1D1F' }}>Grow it every day after.</span>
          </h1>

          <p style={{ fontSize: 20, color: '#6E6E73', lineHeight: 1.55, maxWidth: 600, margin: '0 auto 12px', fontWeight: 400, letterSpacing: '-.2px' }}>
            IdeaByLunch turns your marketplace idea into a live, working business system — website, listings, seller onboarding, buyer capture, payments readiness, analytics, and AI growth recommendations.
          </p>

          <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '0 auto 36px', maxWidth: 520 }}>
            Built for marketplace founders who need more than a landing page.
          </p>

          <div className="hero-btns" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <Link href="/app" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 12, padding: '16px 32px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block', boxShadow: '0 4px 16px rgba(0,102,204,.25)' }}>
              Cook my idea →
            </Link>
            <a href="#what-you-get" style={{ background: '#FFFFFF', color: '#1D1D1F', borderRadius: 12, padding: '16px 28px', fontSize: 17, fontWeight: 500, letterSpacing: '-.2px', display: 'inline-block', border: '0.5px solid rgba(0,0,0,.12)' }}>
              See what you get
            </a>
          </div>

          {/* Outcome pills */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Live marketplace', 'Seller onboarding', 'Buyer capture', 'Growth dashboard', 'AI recommendations'].map(label => (
              <div key={label} style={{ background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,.08)', borderRadius: 100, padding: '7px 16px', fontSize: 13, fontWeight: 500, color: '#1D1D1F', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Problem ──────────────────────────────────────────────────── */}
        <div id="problem" style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ background: '#1D1D1F', borderRadius: 24, padding: '56px 48px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,59,48,.5), transparent)' }} />
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 16 }}>The real problem</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-1.5px', margin: '0 0 20px', lineHeight: 1.15 }}>
              Most marketplace ideas die after the website launches.
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.6)', lineHeight: 1.6, margin: '0 0 40px', maxWidth: 560 }}>
              Founders don&apos;t fail because they can&apos;t get a site online. They fail because they can&apos;t recruit sellers, attract buyers, create liquidity, follow up with leads, and know what to do next.
            </p>
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
              {[
                { icon: '😶', label: 'No sellers', desc: 'The marketplace is live. Nobody is listing anything.' },
                { icon: '👻', label: 'No buyers', desc: 'Sellers sign up. Buyers never arrive. Liquidity dies.' },
                { icon: '🔇', label: 'No transactions', desc: 'Traffic trickles in. Nobody pulls the trigger.' },
                { icon: '❓', label: 'No clear next step', desc: 'You built the site. Now what? Nobody tells you.' },
              ].map(p => (
                <div key={p.label} style={{ background: 'rgba(255,255,255,.06)', border: '0.5px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '20px 22px' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginBottom: 6 }}>{p.label}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Solution ─────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>The solution</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 14px', lineHeight: 1.1 }}>
              IdeaByLunch gives you the launch system,<br />not just the site.
            </h2>
            <p style={{ fontSize: 17, color: '#6E6E73', margin: '0 auto', maxWidth: 520, lineHeight: 1.55 }}>
              Every marketplace comes with the full operating layer — not a template you have to figure out alone.
            </p>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { icon: '🏗️', label: 'Marketplace site', desc: 'Live, deployed, and yours. Custom domain, SEO-ready pages, mobile-first.' },
              { icon: '📋', label: 'Listing structure', desc: 'Category architecture, listing templates, and search-ready data model.' },
              { icon: '🤝', label: 'Seller intake', desc: 'Onboarding flow that guides sellers from signup to their first active listing.' },
              { icon: '🎯', label: 'Buyer lead capture', desc: 'Email capture, inquiry flow, and lead management built into every page.' },
              { icon: '💬', label: 'Contact & booking', desc: 'Inquiry forms, booking flows, and contact routing — ready on day one.' },
              { icon: '📊', label: 'Analytics', desc: 'Track sellers, buyers, listings, and leads from a clean admin dashboard.' },
              { icon: '🤖', label: 'AI growth coach', desc: 'Recommends your next move based on where your marketplace is stuck.' },
              { icon: '📅', label: 'Weekly action plan', desc: 'Specific tasks delivered weekly — no guessing what to do next.' },
              { icon: '💳', label: 'Payment readiness', desc: 'Stripe-ready infrastructure. Start collecting revenue from launch day.' },
            ].map(item => (
              <div key={item.label} style={{ background: '#FFFFFF', borderRadius: 16, padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 22, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.2px', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How It Works ─────────────────────────────────────────────── */}
        <div id="how" style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>
              Idea → System → Growth.<br />By lunch.
            </h2>
          </div>
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
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
                body: 'After launch, the system recommends what to do next: recruit sellers, improve listings, follow up with buyers, test pricing, create marketing content.',
              },
            ].map(s => (
              <div key={s.step} style={{ background: '#FFFFFF', borderRadius: 16, padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0066CC', marginBottom: 14, letterSpacing: '.04em' }}>Step {s.step}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.4px', marginBottom: 10, lineHeight: 1.2 }}>{s.title}</div>
                <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.6, margin: 0 }}>{s.body}</p>
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
        <div style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Growth OS</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 12px', lineHeight: 1.1 }}>
              Your AI growth dashboard.
            </h2>
            <p style={{ fontSize: 17, color: '#6E6E73', margin: '0 auto', maxWidth: 480, lineHeight: 1.5 }}>
              After launch, this is what you wake up to every morning.
            </p>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.12), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
            {/* Dashboard header */}
            <div style={{ background: '#1D1D1F', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>Today&apos;s Marketplace Health</span>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontWeight: 500 }}>Live · Updated now</span>
            </div>
            <div style={{ padding: '28px' }}>
              {/* Stat cards */}
              <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Sellers', value: '14', trend: '+3 this week', color: '#0066CC' },
                  { label: 'Buyers', value: '38', trend: '+12 this week', color: '#30D158' },
                  { label: 'Listings', value: '62', trend: '+8 this week', color: '#FF9500' },
                  { label: 'Leads', value: '11', trend: '+5 this week', color: '#BF5AF2' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: '#F2F2F7', borderRadius: 14, padding: '18px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6E6E73', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>{stat.label}</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: stat.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{stat.value}</div>
                    <div style={{ fontSize: 12, color: '#30D158', fontWeight: 500 }}>{stat.trend}</div>
                  </div>
                ))}
              </div>
              {/* Recommended actions */}
              <div style={{ background: '#F2F2F7', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.1px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🤖</span> Recommended actions this week
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { priority: 'High', text: 'Contact 5 inactive sellers — 3 haven\'t listed in 7 days', tag: 'Seller activation' },
                    { priority: 'High', text: 'Add 10 more listings in your strongest category', tag: 'Inventory' },
                    { priority: 'Medium', text: 'Send follow-up email to new buyer leads from this week', tag: 'Buyer nurture' },
                    { priority: 'Medium', text: 'Test a featured listing offer to increase transaction rate', tag: 'Monetisation' },
                    { priority: 'Low', text: 'Publish one local SEO page targeting your top search term', tag: 'Discovery' },
                  ].map((action, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '0.5px solid rgba(0,0,0,.06)' : 'none' }}>
                      <div style={{ flexShrink: 0, marginTop: 1 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: action.priority === 'High' ? '#FF3B30' : action.priority === 'Medium' ? '#FF9500' : '#30D158', marginTop: 4 }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: '#1D1D1F', fontWeight: 500, lineHeight: 1.4 }}>{action.text}</div>
                        <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2 }}>{action.tag}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#AEAEB2', marginTop: 16 }}>This is a preview — your live dashboard reflects your actual marketplace data.</p>
        </div>

        {/* ── Who It&apos;s For ────────────────────────────────────────────── */}
        <div style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Built for</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>
              Who it&apos;s for.
            </h2>
          </div>
          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {WHO_ITS_FOR.map(item => (
              <div key={item.label} style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', lineHeight: 1.3, letterSpacing: '-.1px' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Comparison ───────────────────────────────────────────────── */}
        <div style={{ maxWidth: 720, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Why not just use a website builder?</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>
              Not just a website builder.
            </h2>
          </div>
          <div className="comparison-table" style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', borderBottom: '0.5px solid rgba(0,0,0,.08)' }}>
              <div style={{ padding: '14px 24px', fontSize: 13, fontWeight: 700, color: '#6E6E73', letterSpacing: '.04em', textTransform: 'uppercase' }}>Capability</div>
              <div style={{ padding: '14px 24px', fontSize: 13, fontWeight: 700, color: '#6E6E73', letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'center' }}>Website Builder</div>
              <div style={{ padding: '14px 24px', fontSize: 13, fontWeight: 700, color: '#0066CC', letterSpacing: '.04em', textTransform: 'uppercase', textAlign: 'center', background: 'rgba(0,102,204,.04)' }}>IdeaByLunch</div>
            </div>
            {COMPARISON.map(([capability, competitor, us], i) => (
              <div key={capability} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 160px', borderBottom: i < COMPARISON.length - 1 ? '0.5px solid rgba(0,0,0,.05)' : 'none', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                <div style={{ padding: '14px 24px', fontSize: 15, color: '#1D1D1F', fontWeight: 500 }}>{capability}</div>
                <div style={{ padding: '14px 24px', textAlign: 'center' }}>
                  {competitor
                    ? <span style={{ fontSize: 14, color: '#30D158', fontWeight: 600 }}>Yes</span>
                    : <span style={{ fontSize: 14, color: '#FF3B30', fontWeight: 600 }}>No</span>}
                </div>
                <div style={{ padding: '14px 24px', textAlign: 'center', background: 'rgba(0,102,204,.03)' }}>
                  {us
                    ? <span style={{ fontSize: 14, color: '#0066CC', fontWeight: 700 }}>Yes</span>
                    : <span style={{ fontSize: 14, color: '#AEAEB2' }}>No</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <div id="pricing" style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 12px', lineHeight: 1.1 }}>Simple. Founder-priced.</h2>
            <p style={{ fontSize: 17, color: '#6E6E73', margin: 0, maxWidth: 480, marginInline: 'auto', lineHeight: 1.5 }}>Start with the launch. Add growth when you&apos;re ready.</p>
          </div>

          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 12 }}>
            {/* Launch Package */}
            <div style={{ background: '#FFFFFF', borderRadius: 20, padding: '32px 28px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6E6E73', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Launch Package</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>{p.professional}</div>
              <div style={{ fontSize: 14, color: '#AEAEB2', marginBottom: 24 }}>one-time setup</div>
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
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#1D1D1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontSize: 14, color: '#1D1D1F', lineHeight: 1.4 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/app" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                Launch today →
              </Link>
            </div>

            {/* Growth OS */}
            <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '32px 28px', boxShadow: '0 16px 48px rgba(0,0,0,.22)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#0066CC', color: '#FFF', fontSize: 11, fontWeight: 600, letterSpacing: '.04em', padding: '4px 14px', borderRadius: '0 0 8px 8px', whiteSpace: 'nowrap' }}>Most founders add this</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Growth OS</div>
              <div style={{ fontSize: 48, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-2px', lineHeight: 1, marginBottom: 4 }}>{p.monthly}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', marginBottom: 24 }}>after launch · cancel anytime</div>
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
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,.85)', lineHeight: 1.4 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/app" style={{ background: '#FFFFFF', color: '#1D1D1F', borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                Launch + Grow →
              </Link>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6E6E73', margin: 0, lineHeight: 1.6 }}>
              Cancel anytime. Built for founders validating a real marketplace, not playing with templates.
              <br />
              <span style={{ color: '#0066CC', fontWeight: 500 }}>Brief is always free — no card required to start.</span>
            </p>
          </div>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <div id="faq" style={{ maxWidth: 720, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>The honest answers.</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map(f => (
              <details key={f.q} style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <summary style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.2px', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <span>{f.q}</span>
                  <span style={{ fontSize: 20, color: '#AEAEB2', fontWeight: 300, flexShrink: 0 }}>+</span>
                </summary>
                <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.6, margin: '12px 0 0' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '64px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,102,204,.6), transparent)' }} />
            <h2 style={{ fontSize: 'clamp(32px,5vw,48px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-2px', margin: '0 0 14px', lineHeight: 1.05 }}>
              Your marketplace can be live by lunch.<br />
              <span style={{ color: 'rgba(255,255,255,.45)' }}>Or you can keep thinking about it.</span>
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.5)', margin: '0 0 32px', lineHeight: 1.55 }}>
              Brief in 60 seconds. System live within hours. You own everything.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/app" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 12, padding: '16px 36px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block', boxShadow: '0 4px 24px rgba(0,102,204,.4)' }}>
                Cook my idea →
              </Link>
              <a href="#what-you-get" style={{ background: 'rgba(255,255,255,.1)', color: '#FFFFFF', borderRadius: 12, padding: '16px 28px', fontSize: 17, fontWeight: 500, letterSpacing: '-.2px', display: 'inline-block' }}>
                See what you get
              </a>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{ borderTop: '0.5px solid rgba(0,0,0,.08)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <Link href="/audit" style={{ fontSize: 14, color: '#6E6E73' }}>Free Site Audit</Link>
            <Link href="/empire" style={{ fontSize: 14, color: '#6E6E73' }}>The Empire</Link>
            <Link href="/idea-generator" style={{ fontSize: 14, color: '#6E6E73' }}>Free Idea Generator</Link>
            <Link href="/logo" style={{ fontSize: 14, color: '#6E6E73' }}>Logo Generator</Link>
            <Link href="/gallery" style={{ fontSize: 14, color: '#6E6E73' }}>Built by Lunch</Link>
            <Link href="/refer" style={{ fontSize: 14, color: '#6E6E73' }}>Refer & earn</Link>
            <Link href="/terms" style={{ fontSize: 14, color: '#6E6E73' }}>Terms</Link>
          </div>
          <p style={{ fontSize: 13, color: '#AEAEB2', margin: 0 }}>© 2026 IdeaByLunch · AI Marketplace Launch + Growth OS</p>
        </div>

      </div>
    </>
  )
}
