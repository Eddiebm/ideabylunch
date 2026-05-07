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

const FAQS = [
  {
    q: 'Is this an agency or a tool?',
    a: 'A tool. You own the code, the domain, the customers, the GitHub repo. We are the launchpad, not the contractor. Most founders never speak to us — they just ship.',
  },
  {
    q: "What if my idea isn't good?",
    a: "We will tell you in the brief. The whole point is to find out by lunch — not after six months and $40,000 of build cost. A bad idea found cheaply is a feature, not a bug.",
  },
  {
    q: 'Do I need to know how to code?',
    a: 'No. We deliver a live, deployed business. You also get a master build prompt — drop it into Claude Code, Cursor, or Codex if you want to keep building.',
  },
  {
    q: 'Who owns the code and the domain?',
    a: 'You. 100%. The Vercel project, the GitHub repo, the domain registration — all transferred to you. No lock-in, no licence fee, no vendor moat.',
  },
  {
    q: "How is this different from Bolt, Lovable, or v0?",
    a: 'They generate code. We generate a founder. The brief, the ICP, the GTM, the launch plan, AND a live site. Code is the easy part of being a founder now — strategy and momentum are the hard parts.',
  },
  {
    q: 'Can I really launch by lunch?',
    a: 'Brief in 60 seconds. Live site within hours. The "lunch" is the ritual — buy in the morning, share screenshots with friends at lunch, post on LinkedIn by dinner.',
  },
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
        name: 'IdeaByLunch — Founder Activation Infrastructure',
        description: 'Describe a startup idea, get a complete brief and a live, deployed business in hours.',
        brand: { '@id': 'https://ideabylunch.com/#org' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'USD',
          price: '149',
          availability: 'https://schema.org/InStock',
          url: 'https://ideabylunch.com',
        },
      },
      {
        '@type': 'HowTo',
        name: 'How to launch a startup by lunch',
        description: 'Three steps from idea to live business.',
        step: [
          { '@type': 'HowToStep', position: 1, name: 'Describe your idea', text: 'Type your idea in plain English. One sentence is enough.' },
          { '@type': 'HowToStep', position: 2, name: 'Get your brief', text: 'In 60 seconds, receive a complete founder brief — vision, ICP, GTM, copy, and master build prompt.' },
          { '@type': 'HowToStep', position: 3, name: 'Launch', text: 'We build and deploy a live business at your domain. You own everything.' },
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
      `}</style>

      <div style={{ background: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>

        {/* Nav */}
        <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)' }}>
          <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px' }}>IdeaByLunch</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              <a href="#how" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>How it works</a>
              <a href="#pricing" style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400 }}>Pricing</a>
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

        {/* Live ticker bar */}
        <div style={{ background: '#1D1D1F', padding: '10px 0', marginTop: 52, overflow: 'hidden' }}>
          <div className="ticker-track">
            {Array.from({ length: 2 }).map((_, repeat) => (
              <div key={repeat} style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#30D158', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
                  <strong style={{ color: '#30D158' }}>{deployCount.toLocaleString()}</strong> founders launched · live counter
                </span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>30-day refund if your idea isn&apos;t worth pursuing</span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>You own the code, the domain, the customers</span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>Brief free. Always.</span>
                <span style={{ color: 'rgba(255,255,255,.2)' }}>·</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero */}
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '88px 24px 64px', textAlign: 'center', animation: 'fadeUp .6s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,.08)', borderRadius: 100, padding: '6px 16px', marginBottom: 28, boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158', animation: 'pulseDot 1.6s ease-in-out infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>Founder activation infrastructure · live now</span>
          </div>

          <h1 style={{ fontSize: 'clamp(44px,8.5vw,84px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-3px', lineHeight: 1.0, margin: '0 0 24px' }}>
            Turn your startup idea<br />
            into a live business<br />
            <span style={{ color: '#0066CC' }}>by lunch.</span>
          </h1>

          <p style={{ fontSize: 20, color: '#6E6E73', lineHeight: 1.5, maxWidth: 580, margin: '0 auto 36px', fontWeight: 400, letterSpacing: '-.2px' }}>
            Describe your idea. IdeaByLunch generates your founder brief, positioning, launch strategy, and a real, live website — in minutes.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
            <Link href="/app" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 12, padding: '16px 32px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block', boxShadow: '0 4px 16px rgba(0,102,204,.25)' }}>
              Cook my idea →
            </Link>
            <a href="#how" style={{ background: '#FFFFFF', color: '#1D1D1F', borderRadius: 12, padding: '16px 28px', fontSize: 17, fontWeight: 500, letterSpacing: '-.2px', display: 'inline-block', border: '0.5px solid rgba(0,0,0,.12)' }}>
              Watch a 60-second demo
            </a>
          </div>

          <p style={{ fontSize: 14, color: '#AEAEB2', margin: 0, fontWeight: 500 }}>
            No code. No agency. No 6-month build. Just a founder, an idea, and lunch.
          </p>
        </div>

        {/* App preview card */}
        <div style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px', animation: 'fadeUp .6s .1s ease both' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.12), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
            <div style={{ background: '#F2F2F7', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '0.5px solid rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#FF5F57', '#FFBD2E', '#28C840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ background: '#FFFFFF', borderRadius: 6, padding: '4px 14px', fontSize: 12, color: '#6E6E73', margin: '0 auto', border: '0.5px solid rgba(0,0,0,.08)' }}>
                ideabylunch.com/app
              </div>
            </div>
            <div style={{ padding: '32px 40px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0066CC', marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>Live · 11:47am</div>
              <h2 style={{ fontSize: 32, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.2px', margin: '0 0 16px', lineHeight: 1.1 }}>Stripe for African rideshare drivers.</h2>
              <div style={{ background: '#F2F2F7', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: '#1D1D1F', lineHeight: 1.55 }}>
                  <strong>ICP:</strong> Owner-operators in Lagos, Accra, Nairobi running 1–3 cars on Bolt or Uber. <strong>Hook:</strong> Get paid in 30 seconds, not 7 days. <strong>First 10:</strong> WhatsApp groups in Tema and Lekki, partner with one fleet manager...
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Vision', 'ICP', 'GTM', 'Copy', 'PRD', 'Plan', 'Master Prompt'].map((label) => (
                  <div key={label} style={{ padding: '5px 12px', borderRadius: 100, background: '#1D1D1F', fontSize: 12, fontWeight: 500, color: '#FFFFFF' }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* The transformation — time-stamped */}
        <div id="how" style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>How it works</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>Idea → Brief → Live business.<br />By lunch.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { time: '0:00', title: 'Describe it', body: 'Type your idea in plain English. One sentence or ten — however you think.' },
              { time: '01:00', title: 'Get your brief', body: 'In 60 seconds, a complete founder brief: vision, ICP, GTM, copy, and master build prompt.' },
              { time: 'by lunch', title: 'You\'re a founder', body: 'A live business at your domain. Real Stripe. Real customers. You own everything.' },
            ].map(s => (
              <div key={s.time} style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0066CC', marginBottom: 12, letterSpacing: '.02em', fontVariantNumeric: 'tabular-nums' }}>{s.time}</div>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px', marginBottom: 8 }}>{s.title}</div>
                <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you get — reframed as identity, not features */}
        <div style={{ maxWidth: 780, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>What changes</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>You become a founder.<br />Today.</h2>
            <p style={{ fontSize: 17, color: '#6E6E73', margin: '14px auto 0', maxWidth: 520, lineHeight: 1.5 }}>
              Three things you&apos;ll have by sunset that you didn&apos;t have at breakfast.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              {
                bucket: 'What you\'ll know',
                items: ['Your product vision', 'Your ICP — by name, not persona', 'Your top 3 competitors', 'Your positioning'],
              },
              {
                bucket: 'What you\'ll have',
                items: ['A live, deployed website', 'A 7-document founder brief', 'A master build prompt', 'A GitHub repo you own'],
              },
              {
                bucket: 'What you\'ll do',
                items: ['Take your first customer', 'Run your first GTM motion', 'Hit your first 10-customer milestone', 'Tell people what you do for a living'],
              },
            ].map(b => (
              <div key={b.bucket} style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0066CC', marginBottom: 14, letterSpacing: '.02em' }}>{b.bucket}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {b.items.map(item => (
                    <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="#1D1D1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ fontSize: 14, color: '#1D1D1F', lineHeight: 1.4 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing — Launch / Growth / Scale + Venture */}
        <div id="pricing" style={{ maxWidth: 900, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Pricing</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 12px', lineHeight: 1.1 }}>Pick your altitude.</h2>
            <p style={{ fontSize: 17, color: '#6E6E73', margin: 0, maxWidth: 520, marginInline: 'auto', lineHeight: 1.5 }}>Brief is always free. Pay only when you want to be live by lunch.</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {[
                {
                  name: 'Launch', price: p.starter, monthly: p.monthly, tag: 'Today', primary: false,
                  desc: 'You become a founder by tonight.',
                  outcomes: ['Live business at your domain', 'Single, sharp landing page', 'Real Stripe checkout', '7-document founder brief', 'Live in hours'],
                  cta: 'Launch today →',
                },
                {
                  name: 'Growth', price: p.professional, monthly: p.monthly, tag: 'This week', primary: true,
                  desc: 'You launch and have a GTM plan.',
                  outcomes: ['Everything in Launch', 'Multi-page site with custom voice', 'GTM motion + first-10-customers playbook', 'Founder positioning + brand kit', 'Live by lunch tomorrow'],
                  cta: 'Most founders pick this →',
                },
                {
                  name: 'Scale', price: p.premium, monthly: p.monthly, tag: 'This month', primary: false,
                  desc: 'You can take serious orders.',
                  outcomes: ['Everything in Growth', 'Booking, payments, scheduling', 'Custom design system', 'Analytics + conversion dashboard', 'Priority delivery, same day'],
                  cta: 'Scale up →',
                },
              ].map(tier => (
                <div key={tier.name} style={{ background: tier.primary ? '#1D1D1F' : '#FFFFFF', borderRadius: 16, padding: '28px 24px', boxShadow: tier.primary ? '0 16px 48px rgba(0,0,0,.22)' : '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {tier.primary && <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: '#0066CC', color: '#FFF', fontSize: 11, fontWeight: 600, letterSpacing: '.04em', padding: '4px 14px', borderRadius: '0 0 8px 8px' }}>Most popular</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: tier.primary ? '#FFFFFF' : '#1D1D1F', letterSpacing: '-.3px' }}>{tier.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, background: tier.primary ? 'rgba(255,255,255,.12)' : '#F2F2F7', color: tier.primary ? 'rgba(255,255,255,.7)' : '#6E6E73', borderRadius: 6, padding: '3px 8px', letterSpacing: '.04em' }}>{tier.tag}</div>
                  </div>
                  <div style={{ fontSize: 38, fontWeight: 700, color: tier.primary ? '#FFFFFF' : '#1D1D1F', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 4 }}>{tier.price}</div>
                  <div style={{ fontSize: 13, color: tier.primary ? 'rgba(255,255,255,.45)' : '#AEAEB2', marginBottom: 4 }}>then {tier.monthly} (Operator)</div>
                  <div style={{ fontSize: 14, color: tier.primary ? 'rgba(255,255,255,.65)' : '#1D1D1F', marginBottom: 20, fontWeight: 500, letterSpacing: '-.1px' }}>{tier.desc}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                    {tier.outcomes.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 10, marginBottom: 9, alignItems: 'flex-start' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: tier.primary ? 'rgba(255,255,255,.15)' : '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke={tier.primary ? 'white' : '#1D1D1F'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: 14, color: tier.primary ? 'rgba(255,255,255,.85)' : '#1D1D1F', lineHeight: 1.4 }}>{f}</span>
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

          {/* Venture tier */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#AEAEB2', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Venture · for serious founders</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.6px', marginBottom: 4 }}>Full SaaS or app — from {p.fullProduct}</div>
              <div style={{ fontSize: 14, color: '#6E6E73' }}>Auth, database, payments, custom design system. Delivered in 5–7 days. Investor-grade.</div>
            </div>
            <Link href="/app" style={{ background: '#1D1D1F', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Build my product →
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div id="faq" style={{ maxWidth: 720, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>FAQ</div>
            <h2 style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0, lineHeight: 1.1 }}>The honest answers.</h2>
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

        {/* Final CTA */}
        <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
          <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '64px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,102,204,.6), transparent)' }} />
            <h2 style={{ fontSize: 44, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-2px', margin: '0 0 14px', lineHeight: 1.05 }}>You can have a business by lunch.<br /><span style={{ color: 'rgba(255,255,255,.55)' }}>Or you can keep thinking about it.</span></h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,.55)', margin: '0 0 32px', lineHeight: 1.55 }}>60 seconds. No signup. No card. Just your idea.</p>
            <Link href="/app" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 12, padding: '16px 36px', fontSize: 17, fontWeight: 600, letterSpacing: '-.2px', display: 'inline-block', boxShadow: '0 4px 24px rgba(0,102,204,.4)' }}>
              Cook my idea →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '0.5px solid rgba(0,0,0,.08)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <Link href="/audit" style={{ fontSize: 14, color: '#6E6E73' }}>Free Site Audit</Link>
            <Link href="/idea-generator" style={{ fontSize: 14, color: '#6E6E73' }}>Free Idea Generator</Link>
            <Link href="/taglines" style={{ fontSize: 14, color: '#6E6E73' }}>Tagline Generator</Link>
            <Link href="/logo" style={{ fontSize: 14, color: '#6E6E73' }}>Logo Generator</Link>
            <Link href="/gallery" style={{ fontSize: 14, color: '#6E6E73' }}>Built by Lunch</Link>
            <Link href="/terms" style={{ fontSize: 14, color: '#6E6E73' }}>Terms</Link>
          </div>
          <p style={{ fontSize: 13, color: '#AEAEB2', margin: 0 }}>© 2026 IdeaByLunch · The fastest way to become a founder.</p>
        </div>
      </div>
    </>
  )
}
