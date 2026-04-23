import type { Metadata } from 'next'

const NICHES: Record<string, { title: string; headline: string; sub: string; examples: string[] }> = {
  salon: {
    title: 'Hair Salon Websites | idea2Lunch',
    headline: 'Professional websites for hair salons — live in 48 hours.',
    sub: 'Attract more clients with a booking-ready website built for your salon. No tech skills needed.',
    examples: ['Hair salon in Accra', 'Barbershop in Lagos', 'Beauty studio in Nairobi'],
  },
  plumber: {
    title: 'Plumber Websites | idea2Lunch',
    headline: 'Get more plumbing jobs with a professional website.',
    sub: 'A fast, mobile-friendly site that shows up when local customers search for a plumber.',
    examples: ['Emergency plumber in Accra', 'Commercial plumbing Lagos', 'Residential plumber Kumasi'],
  },
  restaurant: {
    title: 'Restaurant Websites | idea2Lunch',
    headline: 'A beautiful menu website for your restaurant — ready in 48 hours.',
    sub: 'Show your menu, location, and hours. Drive walk-ins and online orders.',
    examples: ['Local chop bar Accra', 'Fast food Lagos', 'Fine dining Abuja'],
  },
  electrician: {
    title: 'Electrician Websites | idea2Lunch',
    headline: 'Win more electrical jobs with a site that builds trust.',
    sub: 'Showcase your services, certifications, and contact info to local customers.',
    examples: ['Electrician in Accra', 'Wiring contractor Lagos', 'Generator installation Tema'],
  },
  tailor: {
    title: 'Tailor & Fashion Designer Websites | idea2Lunch',
    headline: 'Show your work. Book more clients. Grow your fashion brand.',
    sub: 'A stunning portfolio site for tailors, seamstresses, and fashion designers.',
    examples: ['Bespoke tailor Accra', 'Wedding dress maker Lagos', 'African print designer Kumasi'],
  },
  clinic: {
    title: 'Clinic & Medical Practice Websites | idea2Lunch',
    headline: 'A trustworthy website for your clinic that attracts patients.',
    sub: 'Display your services, doctors, and opening hours. Build patient trust online.',
    examples: ['Private clinic Accra', 'Dental practice Lagos', 'Eye clinic Abuja'],
  },
}

const DEFAULT = {
  title: 'Professional Business Websites | idea2Lunch',
  headline: 'A professional website for your business — live in 48 hours.',
  sub: 'idea2Lunch builds fast, mobile-ready websites for local businesses across Africa.',
  examples: ['Local businesses across West Africa', 'Service businesses in Ghana & Nigeria'],
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const niche = NICHES[slug] || DEFAULT
  return { title: niche.title, description: niche.sub }
}

export default async function NichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const niche = NICHES[slug] || DEFAULT

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>idea2Lunch</a>
        <a href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Build my site →</a>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(32px,6vw,52px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 16px' }}>
          {niche.headline}
        </h1>
        <p style={{ fontSize: 18, color: '#6E6E73', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 36px' }}>{niche.sub}</p>
        <a href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: 17, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
          Get my free brief →
        </a>

        <div style={{ marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {niche.examples.map((ex, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158' }} />
                <span style={{ fontSize: 12, color: '#30D158', fontWeight: 600 }}>Live</span>
              </div>
              <p style={{ fontSize: 14, color: '#1D1D1F', fontWeight: 500, margin: 0 }}>{ex}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64, background: '#fff', borderRadius: 20, padding: '36px 32px', boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.8px', margin: '0 0 12px' }}>How it works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, textAlign: 'left' }}>
            {[
              { n: '1', h: 'Describe your business', b: 'Tell us your name, location, and services in plain English.' },
              { n: '2', h: 'We build it', b: 'Our AI generates a professional site tailored to your industry.' },
              { n: '3', h: 'Go live', b: 'Your site is live within 48 hours. Edit anytime from your dashboard.' },
            ].map(({ n, h, b }) => (
              <div key={n}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0066CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{n}</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>{h}</p>
                <p style={{ fontSize: 13, color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
