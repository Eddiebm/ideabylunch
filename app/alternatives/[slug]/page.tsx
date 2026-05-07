export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Comparison = {
  competitor: string
  url: string
  oneLiner: string
  hero: string
  positioningGap: string
  rows: Array<{ feature: string; them: string; us: string }>
  verdict: string
}

const COMPARISONS: Record<string, Comparison> = {
  bolt: {
    competitor: 'Bolt.new',
    url: 'https://bolt.new',
    oneLiner: 'AI code generator. Stops at the code.',
    hero: 'Bolt builds a codebase. IdeaByLunch makes you a founder.',
    positioningGap: 'Bolt is a tool for engineers who already know what they\'re building. IdeaByLunch is for founders who have an idea and need the brief, the ICP, the GTM, and the live business — not just the code.',
    rows: [
      { feature: 'Generates working code', them: 'Yes', us: 'Yes' },
      { feature: 'Founder brief (vision, ICP, market)', them: 'No', us: 'Yes' },
      { feature: 'Go-to-market strategy', them: 'No', us: 'Yes' },
      { feature: 'First-10-customers playbook', them: 'No', us: 'Yes' },
      { feature: 'Master build prompt', them: 'No', us: 'Yes' },
      { feature: 'Domain registered + connected', them: 'You do it', us: 'We do it' },
      { feature: 'Deployed to your Vercel', them: 'You do it', us: 'We do it' },
      { feature: 'Pricing on first project', them: 'Free tier + $20/mo Pro', us: 'From $149 one-time' },
    ],
    verdict: 'If you\'re an engineer who knows the stack, Bolt is great. If you\'re a founder who needs to launch a business by lunch, IdeaByLunch ships you everything Bolt skips.',
  },
  lovable: {
    competitor: 'Lovable',
    url: 'https://lovable.dev',
    oneLiner: 'Prompt-to-app builder. Code-first.',
    hero: 'Lovable generates apps. IdeaByLunch generates founders.',
    positioningGap: 'Lovable is a chat-driven app builder. You still need the strategy, the positioning, the ICP, and the launch plan. IdeaByLunch hands you all of it plus the live business.',
    rows: [
      { feature: 'Conversational app generation', them: 'Yes', us: 'Yes' },
      { feature: 'Strategic founder brief', them: 'No', us: 'Yes' },
      { feature: 'ICP + competitor analysis', them: 'No', us: 'Yes' },
      { feature: 'Marketing copy + taglines', them: 'No', us: 'Yes' },
      { feature: 'Domain + Stripe + email', them: 'You do it', us: 'We do it' },
      { feature: 'Time to live business', them: 'Hours of prompting', us: 'By lunch' },
      { feature: 'Pricing', them: 'Free + $20/mo', us: 'From $149 one-time' },
    ],
    verdict: 'Lovable is a smart prompt-to-app builder. IdeaByLunch is the layer above — it turns an idea into an actual launched business, code included.',
  },
  v0: {
    competitor: 'v0 by Vercel',
    url: 'https://v0.dev',
    oneLiner: 'UI generator. Component-first.',
    hero: 'v0 generates components. IdeaByLunch generates a business.',
    positioningGap: 'v0 is a brilliant UI generator for designers and engineers. It does not write your strategy, find your customers, or launch your domain. IdeaByLunch does all of that and ships the code too.',
    rows: [
      { feature: 'AI-generated UI components', them: 'Yes', us: 'Yes' },
      { feature: 'Full-stack app, not just UI', them: 'Limited', us: 'Yes' },
      { feature: 'Founder brief + GTM', them: 'No', us: 'Yes' },
      { feature: 'Live deployed business', them: 'You assemble', us: 'We deploy' },
      { feature: 'Domain registration', them: 'No', us: 'Yes' },
      { feature: 'Stripe + email + auth wired', them: 'No', us: 'Yes' },
      { feature: 'Pricing', them: 'Free + $20/mo Pro', us: 'From $149 one-time' },
    ],
    verdict: 'v0 is the right tool when you\'re iterating on a UI. IdeaByLunch is the right tool when you want to be running a business by lunch.',
  },
  base44: {
    competitor: 'Base44',
    url: 'https://base44.com',
    oneLiner: 'AI app builder. Generalist.',
    hero: 'Base44 builds apps. IdeaByLunch builds founders.',
    positioningGap: 'Base44 is an AI-powered app builder. IdeaByLunch is founder activation infrastructure — strategy, brief, GTM, and the live business in one motion.',
    rows: [
      { feature: 'AI app generation', them: 'Yes', us: 'Yes' },
      { feature: 'Strategic founder brief', them: 'No', us: 'Yes' },
      { feature: 'GTM + first 10 customers', them: 'No', us: 'Yes' },
      { feature: 'Live business by lunch', them: 'No', us: 'Yes' },
      { feature: 'You own the GitHub repo', them: 'Varies', us: 'Yes' },
    ],
    verdict: 'Base44 helps you build an app. IdeaByLunch helps you become a founder.',
  },
  replit: {
    competitor: 'Replit AI',
    url: 'https://replit.com',
    oneLiner: 'AI dev environment. Engineer-first.',
    hero: 'Replit gives you an environment. IdeaByLunch gives you a business.',
    positioningGap: 'Replit AI is a fantastic engineering surface. IdeaByLunch is the missing layer above — strategy, market intelligence, GTM, and a live business at your domain.',
    rows: [
      { feature: 'AI coding environment', them: 'Yes', us: 'No (we hand over the repo)' },
      { feature: 'Founder strategic brief', them: 'No', us: 'Yes' },
      { feature: 'ICP + competitor analysis', them: 'No', us: 'Yes' },
      { feature: 'Live deployed business', them: 'You do it', us: 'We do it' },
      { feature: 'Pricing', them: '$20–35/mo', us: 'From $149 one-time' },
    ],
    verdict: 'Replit is where engineers code. IdeaByLunch is where founders launch.',
  },
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = COMPARISONS[slug]
  if (!c) return { title: 'IdeaByLunch alternatives' }
  return {
    title: `${c.competitor} alternative — IdeaByLunch`,
    description: `${c.competitor} vs IdeaByLunch. ${c.oneLiner} See why founders pick IdeaByLunch when they want a real, live business — not just code.`,
    alternates: { canonical: `/alternatives/${slug}` },
    openGraph: {
      title: `${c.competitor} alternative — IdeaByLunch`,
      description: c.hero,
      url: `https://ideabylunch.com/alternatives/${slug}`,
    },
  }
}

export default async function AlternativePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = COMPARISONS[slug]
  if (!c) notFound()

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

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '64px 24px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 14 }}>{c.competitor} alternative</div>
        <h1 style={{ fontSize: 'clamp(36px,6.5vw,60px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2.2px', lineHeight: 1.05, margin: '0 0 20px' }}>
          {c.hero}
        </h1>
        <p style={{ fontSize: 18, color: '#6E6E73', lineHeight: 1.55, maxWidth: 600, margin: '0 auto 28px' }}>
          {c.positioningGap}
        </p>
        <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 12, padding: '14px 28px', fontSize: 17, fontWeight: 600, display: 'inline-block' }}>
          Cook my idea →
        </Link>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', background: '#F2F2F7', padding: '14px 20px', fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73' }}>
            <div>Feature</div>
            <div style={{ textAlign: 'center' }}>{c.competitor}</div>
            <div style={{ textAlign: 'center', color: '#0066CC' }}>IdeaByLunch</div>
          </div>
          {c.rows.map((row, i) => (
            <div key={row.feature} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '14px 20px', fontSize: 14, color: '#1D1D1F', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,.06)', alignItems: 'center' }}>
              <div style={{ fontWeight: 500 }}>{row.feature}</div>
              <div style={{ textAlign: 'center', color: '#6E6E73' }}>{row.them}</div>
              <div style={{ textAlign: 'center', fontWeight: 600 }}>{row.us}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0066CC', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Verdict</div>
          <p style={{ fontSize: 17, color: '#1D1D1F', lineHeight: 1.55, margin: 0, fontWeight: 500, letterSpacing: '-.2px' }}>{c.verdict}</p>
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: '#1D1D1F', borderRadius: 20, padding: '48px 36px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', letterSpacing: '-1.2px', margin: '0 0 12px' }}>Try the founder layer.</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.6)', margin: '0 0 24px' }}>Brief is free. Live business by lunch.</p>
          <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 600, display: 'inline-block' }}>
            Cook my idea →
          </Link>
        </div>
      </div>
    </>
  )
}
