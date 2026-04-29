export const runtime = 'edge'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { resolveMarket, MARKET_PRICING } from '../../lib/pricing'

const NICHES: Record<string, { title: string; headline: string; sub: string; examples: string[] }> = {
  plumber: {
    title: 'Plumber Websites | IdeaByLunch',
    headline: 'Get more plumbing jobs with a professional website.',
    sub: 'A fast, mobile-friendly site that shows up when local customers search for a plumber. Live in 48 hours.',
    examples: ['Emergency plumber in Atlanta', 'Residential plumber in Houston', 'Commercial plumbing in Phoenix'],
  },
  electrician: {
    title: 'Electrician Websites | IdeaByLunch',
    headline: 'Win more electrical jobs with a site that builds trust.',
    sub: 'Showcase your services, certifications, and contact info to local customers.',
    examples: ['Electrician in Atlanta', 'Wiring contractor in Houston', 'Generator installation in Phoenix'],
  },
  salon: {
    title: 'Hair Salon Websites | IdeaByLunch',
    headline: 'Professional websites for hair salons — live in 48 hours.',
    sub: 'Attract more clients with a booking-ready website built for your salon. No tech skills needed.',
    examples: ['Hair salon in Atlanta', 'Barbershop in Houston', 'Beauty studio in Phoenix'],
  },
  barber: {
    title: 'Barber Shop Websites | IdeaByLunch',
    headline: 'A sharp website for your barbershop — ready in 48 hours.',
    sub: 'Let clients book online, see your work, and find your shop. More chairs filled.',
    examples: ['Barbershop in Atlanta', 'Fade specialists in Houston', 'Classic barber in Phoenix'],
  },
  restaurant: {
    title: 'Restaurant Websites | IdeaByLunch',
    headline: 'A beautiful menu website for your restaurant — ready in 48 hours.',
    sub: 'Show your menu, location, and hours. Drive walk-ins and online orders.',
    examples: ['BBQ restaurant in Atlanta', 'Tex-Mex in Houston', 'Pizza place in Phoenix'],
  },
  cleaning: {
    title: 'Cleaning Service Websites | IdeaByLunch',
    headline: 'Get more cleaning clients with a professional website.',
    sub: 'Show your services, coverage area, and pricing. Book jobs directly from your site.',
    examples: ['Home cleaning in Atlanta', 'Commercial cleaning in Houston', 'Move-out cleaning in Phoenix'],
  },
  landscaper: {
    title: 'Landscaper Websites | IdeaByLunch',
    headline: 'A professional website for your landscaping business.',
    sub: 'Showcase your work, list your services, and let customers get a quote online.',
    examples: ['Lawn care in Atlanta', 'Landscaping in Houston', 'Tree trimming in Phoenix'],
  },
  roofer: {
    title: 'Roofing Company Websites | IdeaByLunch',
    headline: 'Win more roofing jobs with a site customers trust.',
    sub: 'Professional roofing websites with your services, service area, and contact form.',
    examples: ['Roof repair in Atlanta', 'Roofing contractor in Houston', 'Roof replacement in Phoenix'],
  },
  trainer: {
    title: 'Personal Trainer Websites | IdeaByLunch',
    headline: 'A professional website that gets you more personal training clients.',
    sub: 'Show your specialties, certifications, and let clients book sessions online.',
    examples: ['Personal trainer in Atlanta', 'Fitness coach in Houston', 'Gym trainer in Phoenix'],
  },
  clinic: {
    title: 'Clinic & Medical Practice Websites | IdeaByLunch',
    headline: 'A trustworthy website for your clinic that attracts patients.',
    sub: 'Display your services, doctors, and opening hours. Build patient trust online.',
    examples: ['Private clinic in Atlanta', 'Dental practice in Houston', 'Eye clinic in Phoenix'],
  },
  tailor: {
    title: 'Tailor & Fashion Designer Websites | IdeaByLunch',
    headline: 'Show your work. Book more clients. Grow your fashion brand.',
    sub: 'A stunning portfolio site for tailors, seamstresses, and fashion designers.',
    examples: ['Bespoke tailor in Atlanta', 'Wedding dress maker in Houston', 'Alterations in Phoenix'],
  },
  cafe: {
    title: 'Cafe & Coffee Shop Websites | IdeaByLunch',
    headline: 'A beautiful website for your cafe — live in 48 hours.',
    sub: 'Show your menu, hours, and vibe. Get found by local coffee lovers.',
    examples: ['Coffee shop in Atlanta', 'Bakery cafe in Houston', 'Espresso bar in Phoenix'],
  },
}

const DEFAULT = {
  title: 'Professional Business Websites | IdeaByLunch',
  headline: 'A professional website for your business — live in 48 hours.',
  sub: 'IdeaByLunch builds fast, mobile-ready websites for local businesses. Starting at $299.',
  examples: ['Local service businesses', 'Restaurants and cafes', 'Tradespeople and contractors'],
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const niche = NICHES[slug] || DEFAULT
  return { title: niche.title, description: niche.sub }
}

export default async function NichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const niche = NICHES[slug] || DEFAULT
  const headersList = await headers()
  const country = headersList.get('x-vercel-ip-country')
  const marketCode = resolveMarket({ country })
  const p = MARKET_PRICING[marketCode]

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>IdeaByLunch</a>
        <a href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Build my site →</a>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px 80px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(32px,6vw,52px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 16px' }}>
          {niche.headline}
        </h1>
        <p style={{ fontSize: 18, color: '#6E6E73', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 12px' }}>{niche.sub}</p>
        <p style={{ fontSize: 15, color: '#0066CC', fontWeight: 600, margin: '0 auto 32px' }}>
          From {p.professional} setup · then {p.monthly}
        </p>
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
              { n: '1', h: 'Describe your business', b: 'Tell us your name, location, and services in plain English. Takes 60 seconds.' },
              { n: '2', h: 'We build it', b: 'We build a professional site tailored to your industry. You own everything.' },
              { n: '3', h: 'Go live in 48 hours', b: 'Your site is live within 48 hours. No agency, no waiting, no DIY.' },
            ].map(({ n, h, b }) => (
              <div key={n}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0066CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{n}</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '0 0 4px' }}>{h}</p>
                <p style={{ fontSize: 13, color: '#6E6E73', margin: 0, lineHeight: 1.5 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, background: '#1D1D1F', borderRadius: 16, padding: '28px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.85)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Brief is free. Pay only when you want us to build it.
          </p>
          <a href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
            Start free →
          </a>
        </div>
      </div>
    </>
  )
}
