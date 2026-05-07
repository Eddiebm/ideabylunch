export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import Stripe from 'stripe'
import { getRedis } from '@/app/lib/redis'
import type { StoredAudit } from '@/app/api/audit/route'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

async function getAudit(slug: string): Promise<StoredAudit | null> {
  const redis = getRedis()
  if (!redis) return null
  const raw = await redis.get<StoredAudit | string>(`audit:${slug}`)
  if (!raw) return null
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as StoredAudit } catch { return null }
  }
  return raw as StoredAudit
}

async function isPaid(sessionId: string, slug: string): Promise<boolean> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status !== 'paid') return false
    if (session.metadata?.slug !== slug) return false
    return true
  } catch {
    return false
  }
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

function escapeBackticks(s: string) {
  return s.replace(/`/g, '\\`').replace(/\${/g, '\\${')
}

function generateHeroPatch(a: StoredAudit['audit']) {
  return `// app/page.tsx — Hero section
// Replace your existing <h1> / <p> / CTA block with this.

<div style={{ maxWidth: 820, margin: '0 auto', padding: '88px 24px 64px', textAlign: 'center' }}>
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '0.5px solid rgba(0,0,0,.08)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158' }} />
    <span style={{ fontSize: 13, fontWeight: 500, color: '#1D1D1F' }}>Live now</span>
  </div>

  <h1 style={{ fontSize: 'clamp(44px,8.5vw,84px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-3px', lineHeight: 1.0, margin: '0 0 24px' }}>
    ${escapeBackticks(a.rewrite.h1)}
  </h1>

  <p style={{ fontSize: 20, color: '#6E6E73', lineHeight: 1.5, maxWidth: 580, margin: '0 auto 36px' }}>
    ${escapeBackticks(a.rewrite.sub)}
  </p>

  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
    <Link href="/app" style={{ background: '#0066CC', color: '#FFFFFF', borderRadius: 12, padding: '16px 32px', fontSize: 17, fontWeight: 600 }}>
      ${escapeBackticks(a.rewrite.primaryCta)} →
    </Link>
    <a href="#how" style={{ background: '#FFFFFF', color: '#1D1D1F', borderRadius: 12, padding: '16px 28px', fontSize: 17, fontWeight: 500, border: '0.5px solid rgba(0,0,0,.12)' }}>
      ${escapeBackticks(a.rewrite.secondaryCta)}
    </a>
  </div>

  <p style={{ fontSize: 14, color: '#AEAEB2', margin: 0, fontWeight: 500 }}>
    ${escapeBackticks(a.rewrite.microcopy)}
  </p>
</div>`
}

function generateFaqPatch(a: StoredAudit['audit']) {
  const faqs = JSON.stringify(a.faqs, null, 2).replace(/^/gm, '  ')
  return `// app/page.tsx — FAQ data + section + JSON-LD
// 1) Add this constant near the top of the file:

const FAQS = ${faqs} as const

// 2) Inside your <script type="application/ld+json"> @graph array, add:

{
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

// 3) Add this section to your homepage:

<div id="faq" style={{ maxWidth: 720, margin: '0 auto 96px', padding: '0 24px' }}>
  <div style={{ textAlign: 'center', marginBottom: 40 }}>
    <h2 style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: 0 }}>The honest answers.</h2>
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {FAQS.map(f => (
      <details key={f.q} style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
        <summary style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', cursor: 'pointer', listStyle: 'none' }}>
          {f.q}
        </summary>
        <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.6, margin: '12px 0 0' }}>{f.a}</p>
      </details>
    ))}
  </div>
</div>`
}

function generateTierPatch(a: StoredAudit['audit']) {
  if (a.tierRename.length === 0) return null
  const lines = a.tierRename.map(t => `// ${t.from.padEnd(16)} → ${t.to.padEnd(16)} · "${t.tag}" — ${t.desc}`).join('\n')
  return `// Pricing tier rename — display labels only
// Find your pricing render in app/page.tsx (or pricing.ts) and update the
// human-visible tier names. Keep the keys the same to avoid breaking refs.

${lines}

// Suggested tier object shape:

const TIERS = ${JSON.stringify(a.tierRename.map(t => ({ name: t.to, tag: t.tag, desc: t.desc })), null, 2)}`
}

const STEPS = (hasTier: boolean) => [
  { n: 1, t: 'Replace the hero', body: 'Open app/page.tsx. Find your current <h1> and replace with the Hero patch below. The patch is drop-in if you use Next.js App Router with inline styles. If you use Tailwind / shadcn, port the strings into your existing component.' },
  { n: 2, t: 'Add the FAQ + JSON-LD', body: 'Paste the FAQ patch into the same file. The FAQS constant lives at the top, the JSON-LD addition goes inside your existing @graph array, and the FAQ section renders below your pricing.' },
  ...(hasTier ? [{ n: 3, t: 'Rename pricing tiers', body: 'Update the human-visible tier labels per the patch. The keys stay the same — only the display strings change. Stripe product names need to be renamed separately in your Stripe dashboard if you also want them to appear renamed on receipts.' }] : []),
  { n: hasTier ? 4 : 3, t: 'Deploy', body: 'git add app/page.tsx && git commit -m "feat: founder-activation rewrite" && git push. Vercel auto-deploys. Verify the new hero is live and the JSON-LD validates at https://search.google.com/test/rich-results' },
  { n: hasTier ? 5 : 4, t: 'Request reindex', body: 'In Search Console, paste your homepage URL into URL Inspection → Request Indexing. Google will re-crawl with the new conviction-grade content within hours.' },
]

export default async function FullAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const sessionId = sp.session_id

  if (!sessionId) redirect(`/audit/${slug}`)

  const paid = await isPaid(sessionId, slug)
  if (!paid) redirect(`/audit/${slug}`)

  const data = await getAudit(slug)
  if (!data) notFound()

  const a = data.audit
  const heroPatch = generateHeroPatch(a)
  const faqPatch = generateFaqPatch(a)
  const tierPatch = generateTierPatch(a)
  const steps = STEPS(a.tierRename.length > 0)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        a { text-decoration: none; }
        pre.code { background: #0d0d0f; color: #e8e8ea; padding: 20px 24px; border-radius: 12px; overflow-x: auto; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 1.6; margin: 0; white-space: pre; }
      `}</style>

      <nav style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F' }}>IdeaByLunch</Link>
          <Link href={`/audit/${slug}`} style={{ fontSize: 14, color: '#6E6E73' }}>← Back to audit</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '56px 24px 24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1D1D1F', borderRadius: 100, padding: '6px 14px', marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#30D158', letterSpacing: '.04em' }}>✓ PAID</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>Your rewrite is ready to ship.</span>
        </div>
        <h1 style={{ fontSize: 'clamp(36px,5.5vw,52px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2px', lineHeight: 1.05, margin: '0 0 16px' }}>
          Ship the rewrite to {data.domain}.
        </h1>
        <p style={{ fontSize: 18, color: '#6E6E73', lineHeight: 1.55, margin: '0 0 0', maxWidth: 640 }}>
          Below: ready-to-paste Next.js code patches and a step-by-step implementation guide. Bookmark this page — it stays live for 90 days.
        </p>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '32px 24px 0' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.7px', margin: '0 0 18px' }}>Implementation steps</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map(s => (
            <div key={s.n} style={{ background: '#FFFFFF', borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#0066CC', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.2px', marginBottom: 4 }}>{s.t}</div>
                <p style={{ fontSize: 14, color: '#6E6E73', lineHeight: 1.55, margin: 0 }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.7px', margin: '0 0 14px' }}>Patch 1 — Hero</h2>
        <pre className="code">{heroPatch}</pre>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.7px', margin: '0 0 14px' }}>Patch 2 — FAQ + JSON-LD</h2>
        <pre className="code">{faqPatch}</pre>
      </div>

      {tierPatch && (
        <div style={{ maxWidth: 880, margin: '0 auto 48px', padding: '0 24px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.7px', margin: '0 0 14px' }}>Patch 3 — Pricing tiers</h2>
          <pre className="code">{tierPatch}</pre>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto 80px', padding: '0 24px' }}>
        <div style={{ background: '#1D1D1F', borderRadius: 16, padding: '32px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#30D158', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 10 }}>Need help shipping?</div>
          <p style={{ fontSize: 16, color: '#FFFFFF', margin: '0 0 20px', lineHeight: 1.5 }}>If pasting code isn&apos;t your thing, we&apos;ll do the whole rewrite for you and ship a PR — Growth tier.</p>
          <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 600, display: 'inline-block' }}>
            Have us ship it →
          </Link>
        </div>
      </div>
    </>
  )
}
