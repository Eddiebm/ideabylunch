export const runtime = 'edge'
import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — IdeaByLunch',
  description: 'What you get, what we promise, and what happens if things go wrong.',
}

const LAST_UPDATED = 'April 2026'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.4px', margin: '0 0 16px', paddingTop: 8 }}>
        {title}
      </h2>
      <div style={{ fontSize: 16, color: '#3C3C43', lineHeight: 1.75 }}>{children}</div>
    </section>
  )
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0066CC', marginTop: 9, flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#F2F2F7', borderRadius: 10, padding: '14px 18px', fontSize: 14, color: '#6E6E73', lineHeight: 1.65, marginTop: 14 }}>
      {children}
    </div>
  )
}

export default function TermsPage() {
  const toc = [
    { id: 'services',    label: 'What you get' },
    { id: 'timeline',   label: 'Delivery timeline' },
    { id: 'handoff',    label: 'Handoff & ownership' },
    { id: 'monthly',    label: 'Monthly plan ($97/mo)' },
    { id: 'edits',      label: 'Edits & scope' },
    { id: 'payment',    label: 'Payment & refunds' },
    { id: 'limits',     label: 'What we do not promise' },
    { id: 'ip',         label: 'Intellectual property' },
    { id: 'liability',  label: 'Liability' },
    { id: 'contact',    label: 'Contact' },
  ]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; }
        a { color: #0066CC; text-decoration: none; }
        a:hover { text-decoration: underline; }
        p { margin: 0 0 12px; }
        ul { margin: 0 0 12px; padding-left: 20px; }
        li { margin-bottom: 6px; }
      `}</style>

      <div style={{ background: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>

        {/* Nav */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(242,242,247,0.9)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)' }}>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px' }}>IdeaByLunch</Link>
            <Link href="/app" style={{ background: '#1D1D1F', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500 }}>Cook my idea</Link>
          </div>
        </nav>

        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, alignItems: 'start' }}>

          {/* Sticky TOC */}
          <aside style={{ position: 'sticky', top: 72 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: '#AEAEB2', marginBottom: 12 }}>Contents</div>
            {toc.map(item => (
              <a key={item.id} href={`#${item.id}`} style={{ display: 'block', fontSize: 13, color: '#6E6E73', padding: '5px 0', lineHeight: 1.4 }}>{item.label}</a>
            ))}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid rgba(0,0,0,.08)', fontSize: 12, color: '#AEAEB2' }}>
              Last updated<br />{LAST_UPDATED}
            </div>
          </aside>

          {/* Body */}
          <main>
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Terms of Service</div>
              <h1 style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 14px', lineHeight: 1.1 }}>
                What we build,<br />what you own.
              </h1>
              <p style={{ fontSize: 17, color: '#6E6E73', lineHeight: 1.6, maxWidth: 520 }}>
                Plain language. No legalese. By paying for an IdeaByLunch service you agree to these terms.
              </p>
            </div>

            <Section id="services" title="1. What you get">
              <p><strong>Launch — $299 one-time</strong></p>
              <Rule>A single-page website built from your brief, in the design style you chose.</Rule>
              <Rule>Deployed to Vercel with a <code style={{ background: '#F2F2F7', padding: '1px 5px', borderRadius: 4, fontSize: 14 }}>*.vercel.app</code> URL on completion, custom domain connected within 24 hours.</Rule>
              <Rule>SSL certificate, mobile-responsive layout, real photography from Unsplash, Google Fonts.</Rule>
              <Rule>Contact form wired to your email.</Rule>
              <Rule>One round of copy edits (headline, subheadline, CTA) requested within 7 days of delivery.</Rule>

              <div style={{ marginTop: 20, marginBottom: 6 }}><strong>Full Product — $1,499 one-time</strong></div>
              <Rule>Everything in Launch, plus up to 5 pages.</Rule>
              <Rule>Authentication (Clerk — email/password + Google), database (Supabase, up to 5 tables), Stripe payments wired on your site.</Rule>
              <Rule>GitHub repository and Vercel project transferred to your own accounts.</Rule>
              <Rule>30 days of support: bug fixes and minor tweaks under 2 hours each.</Rule>
              <Rule>One Loom walkthrough of your codebase (under 15 minutes).</Rule>

              <Note>
                <strong>Not included in either tier:</strong> mobile apps, custom AI features, CMS, multi-tenant setups, GDPR data processing agreements, SEO beyond meta tags and Open Graph, more integrations than listed above.
              </Note>
            </Section>

            <Section id="timeline" title="2. Delivery timeline">
              <p>The delivery clock starts when your payment is confirmed — not when you submit your idea.</p>
              <Rule><strong>Launch:</strong> delivered within 48 business hours.</Rule>
              <Rule><strong>Full Product:</strong> delivered within 72 business hours.</Rule>
              <Rule>Business hours: Monday–Friday, 06:00–22:00 GMT.</Rule>
              <Rule>The clock pauses if we are waiting on information from you (domain name, brand colours, account credentials).</Rule>
              <Rule>The clock resets if you change the brief after payment.</Rule>
              <Note>
                "Delivered" means a live URL has been sent to your email and WhatsApp (if provided). It does not mean the custom domain has fully propagated — DNS can take up to 48 hours depending on your registrar.
              </Note>
            </Section>

            <Section id="handoff" title="3. Handoff & ownership">
              <p><strong>You own everything we build for you.</strong></p>
              <Rule>All code, design, and copy produced for your project is assigned to you on full payment.</Rule>
              <Rule>Launch tier: we host the site on our Vercel account as part of the monthly plan. If you cancel, we transfer the project to your own Vercel account before taking it offline.</Rule>
              <Rule>Full Product tier: GitHub repo and Vercel project are transferred to your accounts within 24 hours of delivery.</Rule>
              <Rule>Your domain is registered in your name (or transferred to you) — we never hold domains on your behalf without your consent.</Rule>
            </Section>

            <Section id="monthly" title="4. Monthly plan — $97/mo">
              <p>The monthly subscription covers:</p>
              <Rule>Domain renewal (prorated, ~$2.40/mo).</Rule>
              <Rule>Vercel hosting.</Rule>
              <Rule>Uptime monitoring — your site is pinged every 5 minutes; we investigate alerts within 4 business hours.</Rule>
              <Rule>One content update per month: text changes, photo swap, or section edit (up to 1 hour of work).</Rule>

              <p style={{ marginTop: 14 }}>The monthly plan does <strong>not</strong> cover new pages, new features, design overhauls, a second domain, or feature development.</p>

              <p><strong>Cancellation:</strong> cancel any time. Your site stays live until the end of the paid period. After that, we send your files and transfer the domain. Hosting goes dark 30 days after the last paid month unless you arrange self-hosting.</p>
              <Note>We do not offer prorated refunds on monthly fees — cancel before the next billing cycle to avoid being charged.</Note>
            </Section>

            <Section id="edits" title="5. Edits & scope">
              <Rule>One round of copy edits is included (Launch) or covered under the 30-day support window (Full Product).</Rule>
              <Rule>A second round of copy edits is $49 flat.</Rule>
              <Rule>Any request that takes more than 30 minutes of work will be quoted before we start.</Rule>
              <Rule>Scope additions after payment are billed separately at $150/hr, minimum 1 hour.</Rule>
              <Rule>"Can you just add X" during the build = out of scope. We will quote it rather than absorb it.</Rule>
            </Section>

            <Section id="payment" title="6. Payment & refunds">
              <p>Payments are processed by Stripe (international) or Paystack (Africa). All prices are in USD.</p>
              <Rule><strong>Refunds before build starts:</strong> full refund if requested within 2 hours of payment and before we begin work.</Rule>
              <Rule><strong>Refunds after build starts:</strong> no refund once the AI generation pipeline has run and a preview has been created for your order.</Rule>
              <Rule><strong>Refunds on delivery failure:</strong> if we fail to deliver within the stated timeline and it is our fault (not yours), you are entitled to a full refund or a free redo.</Rule>
              <Rule>Monthly subscription fees are non-refundable once a billing cycle has started.</Rule>
            </Section>

            <Section id="limits" title="7. What we do not promise">
              <Rule>A specific Google PageSpeed or Lighthouse score.</Rule>
              <Rule>First-page Google ranking or any SEO outcome.</Rule>
              <Rule>Conversion rate or revenue outcomes from your site.</Rule>
              <Rule>Formal uptime SLA with credits — we monitor and respond, but do not offer financial compensation for downtime.</Rule>
              <Rule>Compatibility beyond Chrome, Safari, and Firefox (last 2 major versions each).</Rule>
            </Section>

            <Section id="ip" title="8. Intellectual property">
              <p>We use AI (OpenRouter → Gemini 2.5 Flash) and stock photography (Unsplash) to build your site. By accepting delivery you confirm:</p>
              <Rule>You have the right to use your business name, brief content, and any materials you supplied.</Rule>
              <Rule>Unsplash photos are licensed for commercial use under the <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash License</a>. Attribution is not required but appreciated.</Rule>
              <Rule>AI-generated code and copy passes ownership to you on payment — we make no claim on it.</Rule>
              <Rule>We may show your site in our portfolio unless you ask us not to in writing.</Rule>
              <Rule><strong>The deliverable is licensed for your own business only.</strong> You may not resell, redistribute, sublicense, or reuse the code, copy, or design for other businesses — whether directly or by feeding it into an AI tool to generate derivative sites. Each delivery includes an invisible watermark with your order ID; derivative works may be traced back to you.</Rule>
              <Rule>Breach of this clause terminates your license immediately and entitles us to take down any infringing site and seek damages equal to the full retail price of each unauthorized copy.</Rule>
            </Section>

            <Section id="liability" title="9. Liability">
              <p>IdeaByLunch is a trading name of Eddie Bannerman-Menson.</p>
              <Rule>Our total liability for any claim is capped at the amount you paid us for the relevant service.</Rule>
              <Rule>We are not liable for indirect, incidental, or consequential losses (lost revenue, lost data, lost customers).</Rule>
              <Rule>We are not responsible for third-party service outages (Vercel, Stripe, Supabase, Clerk, Unsplash).</Rule>
              <Rule>These terms are governed by the laws of Ghana. Disputes will be resolved by negotiation first; if that fails, by arbitration in Accra.</Rule>
            </Section>

            <Section id="contact" title="10. Contact">
              <p>Questions about these terms or your order:</p>
              <Rule>Email: <a href="mailto:hello@ideabylunch.com">hello@ideabylunch.com</a></Rule>
              <Rule>WhatsApp: available via the number you used at checkout.</Rule>
              <p style={{ marginTop: 14 }}>We aim to respond within 1 business day.</p>
            </Section>

            <div style={{ borderTop: '0.5px solid rgba(0,0,0,.1)', paddingTop: 24, fontSize: 13, color: '#AEAEB2' }}>
              Last updated: {LAST_UPDATED} · <Link href="/">ideabylunch.com</Link>
            </div>
          </main>
        </div>
      </div>
    </>
  )
}
