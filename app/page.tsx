export const runtime = 'edge'
import Link from 'next/link'
import { headers } from 'next/headers'
import { resolveMarket, MARKET_PRICING } from './lib/pricing'

async function getDeployCount(): Promise<number> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const res = await fetch(`${base}/api/stats`, { next: { revalidate: 60 } })
    const data = await res.json()
    return data.deploys || 0
  } catch { return 0 }
}

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

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; }
        a { text-decoration: none; }
      `}</style>

      <div style={{ background: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>

        {/* Nav */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)' }}>
          <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px' }}>IdeaByLunch</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <a href="#how" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>How it works</a>
              <a href="#pricing" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>Pricing</a>
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

        {/* Trust bar */}
        <div style={{ background: '#1D1D1F', padding: '10px 24px', textAlign: 'center', marginTop: 52 }}>
          <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>
              <span style={{ color: '#30D158', fontWeight: 700 }}>{deployCount.toLocaleString()}</span> sites built
            </span>
            <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>7-day money-back guarantee</span>
            <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Live in 48 hours</span>
            <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Powered by Vercel · Stripe · Cloudflare</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px 24px 80px', textAlign: 'center', animation: 'fadeUp .6s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,.08)', borderRadius: 100, padding: '5px 14px', marginBottom: 28, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>Brief in 60 seconds · Live product in 48 hours</span>
          </div>

          <h1 style={{ fontSize: 'clamp(48px,8vw,72px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-2.5px', lineHeight: 1.05, margin: '0 0 20px' }}>
            Your idea,<br />
            <span style={{ color: '#0066CC' }}>fully cooked.</span>
          </h1>

          <p style={{ fontSize: 19, color: '#6E6E73', lineHeight: 1.55, maxWidth: 480, margin: '0 auto 36px', fontWeight: 400, letterSpacing: '-.2px' }}>
            Describe your idea. Get a complete product brief — vision, market intelligence, copy, launch strategy, and a master build prompt. Free.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/app" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 12, padding: '14px 28px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block' }}>
              Cook my idea — free →
            </Link>
            <a href="#how" style={{ background: '#FFFFFF', color: '#1D1D1F', borderRadius: 12, padding: '14px 28px', fontSize: 17, fontWeight: 500, letterSpacing: '-.2px', display: 'inline-block', border: '0.5px solid rgba(0,0,0,.12)' }}>
              See how it works
            </a>
          </div>
        </div>

        {/* App preview card */}
        <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px', animation: 'fadeUp .6s .1s ease both' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.1), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
            {/* Fake browser bar */}
            <div style={{ background: '#F2F2F7', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#FF5F57', '#FFBD2E', '#28C840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 6, padding: '4px 14px', fontSize: 12, color: '#6E6E73', margin: '0 auto', border: '0.5px solid rgba(0,0,0,.08)' }}>
                ideabylunch.com/app
              </div>
            </div>
            {/* App UI preview */}
            <div style={{ padding: '32px 40px' }}>
              <h2 style={{ fontSize: 36, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 4px' }}>IdeaByLunch</h2>
              <h2 style={{ fontSize: 22, fontWeight: 500, color: '#0066CC', letterSpacing: '-.5px', margin: '0 0 24px' }}>Your idea, fully cooked.</h2>
              <div style={{ background: '#F2F2F7', borderRadius: 12, padding: '16px 20px', marginBottom: 12 }}>
                <div style={{ fontSize: 15, color: '#AEAEB2' }}>Describe your idea — e.g. a website for Mike's Plumbing in St. Louis</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#0066CC', borderRadius: 10, padding: '10px 20px', fontSize: 15, fontWeight: 600, color: '#FFFFFF' }}>Cook my idea</div>
              </div>
              {/* Sample output pills */}
              <div style={{ display: 'flex', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
                {['Vision', 'Plan', 'PRD', 'Market', 'Copy', 'Launch', 'Prompt'].map((label, i) => (
                  <div key={label} style={{ padding: '5px 12px', borderRadius: 100, background: i < 4 ? '#1D1D1F' : 'rgba(0,0,0,.05)', fontSize: 12, fontWeight: 500, color: i < 4 ? '#FFFFFF' : '#AEAEB2', transition: 'all .3s' }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div id="how" style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: 0 }}>Three steps to a live product.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { n: '01', title: 'Describe your idea', body: 'Type your idea in plain English. One sentence or ten — however you think.' },
              { n: '02', title: 'Get your brief', body: 'In 60 seconds, receive a complete product brief with vision, market intelligence, copy, and a master build prompt.' },
              { n: '03', title: 'We build and launch', body: 'Pay once. We build your product, deploy it to Vercel, and deliver a live URL within 48 hours. You own everything.' },
            ].map(s => (
              <div key={s.n} style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0066CC', marginBottom: 12, letterSpacing: '.02em' }}>{s.n}</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px', marginBottom: 8 }}>{s.title}</div>
                <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you get */}
        <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>What you get</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: 0 }}>A complete brief. Free.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {[
              { n: 'I', title: 'Product Vision', body: 'What you\'re building, who it\'s for, and the outcome it delivers.' },
              { n: 'II', title: 'Product Plan', body: '5 features in build-priority order with recommended tech stack.' },
              { n: 'III', title: 'PRD', body: 'User stories and technical requirements ready for a developer.' },
              { n: 'IV', title: 'Market Intelligence', body: 'ICP, top 3 competitors, and your positioning in one paragraph.' },
              { n: 'V', title: 'Marketing Copy', body: 'Taglines, headlines, subheadlines, and CTAs ready to ship.' },
              { n: 'VI', title: 'Launch Strategy', body: 'GTM motion, first 10 customers playbook, and 90-day milestones.' },
              { n: 'VII', title: 'Master Prompt', body: 'A single executable prompt for Claude Code, Cursor, or Codex.' },
            ].map(s => (
              <div key={s.n} style={{ background: '#FFFFFF', borderRadius: 14, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73' }}>{s.n}</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.2px', marginBottom: 4 }}>{s.title}</div>
                  <p style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.5, margin: 0 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Pricing</div>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 8px' }}>Pick your level.</h2>
            <p style={{ fontSize: 17, color: '#6E6E73', margin: 0 }}>Brief is always free. Pay only when you want us to build it.</p>
          </div>

          {/* Website tiers */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#AEAEB2', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14, paddingLeft: 4 }}>Websites</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                {
                  name: 'Starter', price: p.starter, monthly: p.monthly, tag: 'Good', primary: false,
                  desc: '3-page site, live in 48 hours',
                  features: ['3 pages (Home, About, Contact)', 'Mobile-responsive', 'Deployed to your domain', 'Free brief included', '48-hour delivery'],
                  cta: 'Get started →',
                },
                {
                  name: 'Professional', price: p.professional, monthly: p.monthly, tag: 'Better', primary: true,
                  desc: '5 pages + custom copy & colors',
                  features: ['5 pages including Services', 'Custom brand colors & fonts', 'SEO-optimised copy', 'Contact form wired up', '1 round of revisions', '24-hour delivery'],
                  cta: 'Most popular →',
                },
                {
                  name: 'Premium', price: p.premium, monthly: p.monthly, tag: 'Best', primary: false,
                  desc: '8 pages + booking & payments',
                  features: ['8 pages + blog or gallery', 'Online booking or payments', 'Custom design system', 'Analytics dashboard', '3 rounds of revisions', 'Priority 12-hour delivery'],
                  cta: 'Go premium →',
                },
              ].map(tier => (
                <div key={tier.name} style={{ background: tier.primary ? '#1D1D1F' : '#FFFFFF', borderRadius: 16, padding: '24px', boxShadow: tier.primary ? '0 8px 32px rgba(0,0,0,.18)' : '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {tier.primary && <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#0066CC', color: '#FFF', fontSize: 11, fontWeight: 600, letterSpacing: '.04em', padding: '4px 14px', borderRadius: '0 0 8px 8px' }}>Most popular</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tier.primary ? 'rgba(255,255,255,.5)' : '#6E6E73', letterSpacing: '.02em' }}>{tier.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, background: tier.primary ? 'rgba(255,255,255,.12)' : '#F2F2F7', color: tier.primary ? 'rgba(255,255,255,.7)' : '#6E6E73', borderRadius: 6, padding: '3px 8px', letterSpacing: '.04em' }}>{tier.tag}</div>
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 700, color: tier.primary ? '#FFFFFF' : '#1D1D1F', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 2 }}>{tier.price}</div>
                  <div style={{ fontSize: 13, color: tier.primary ? 'rgba(255,255,255,.45)' : '#AEAEB2', marginBottom: 4 }}>then {tier.monthly}</div>
                  <div style={{ fontSize: 13, color: tier.primary ? 'rgba(255,255,255,.4)' : '#AEAEB2', marginBottom: 20 }}>{tier.desc}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                    {tier.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 10, marginBottom: 9, alignItems: 'flex-start' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: tier.primary ? 'rgba(255,255,255,.15)' : '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke={tier.primary ? 'white' : '#1D1D1F'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: 14, color: tier.primary ? 'rgba(255,255,255,.8)' : '#1D1D1F', lineHeight: 1.4 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/app" style={{ background: tier.primary ? '#FFFFFF' : '#1D1D1F', color: tier.primary ? '#1D1D1F' : '#FFFFFF', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 600, letterSpacing: '-.2px', textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                    {tier.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* SaaS / apps tier */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#AEAEB2', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Mobile App or SaaS</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', marginBottom: 4 }}>Full Product — from {p.fullProduct}</div>
              <div style={{ fontSize: 14, color: '#6E6E73' }}>Auth, payments, database, custom design. Delivered in 5–7 days.</div>
            </div>
            <Link href="/app" style={{ background: '#1D1D1F', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Build my product →
            </Link>
          </div>
        </div>

        {/* Final CTA */}
        <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '52px 40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: 40, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-1.5px', margin: '0 0 12px' }}>Your idea is waiting.</h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', margin: '0 0 28px', lineHeight: 1.55 }}>60 seconds. No signup. No card. Just your idea, fully cooked.</p>
            <Link href="/app" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 12, padding: '14px 32px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block' }}>
              Cook my idea — free →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '0.5px solid rgba(0,0,0,.08)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <Link href="/taglines" style={{ fontSize: 14, color: '#6E6E73' }}>Tagline Generator</Link>
            <Link href="/logo" style={{ fontSize: 14, color: '#6E6E73' }}>Logo Generator</Link>
            <Link href="/terms" style={{ fontSize: 14, color: '#6E6E73' }}>Terms of Service</Link>
          </div>
          <p style={{ fontSize: 13, color: '#AEAEB2', margin: 0 }}>© 2026 IdeaByLunch · Your idea, fully cooked.</p>
        </div>
      </div>
    </>
  )
}
