import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — IdeaByLunch',
  description: 'How IdeaByLunch collects, uses, and protects your data.',
  alternates: { canonical: '/privacy' },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', margin: '0 0 16px' }}>{title}</h2>
      <div style={{ fontSize: 15, color: '#3A3A3C', lineHeight: 1.7 }}>{children}</div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 12px' }}>{children}</p>
}

export default function PrivacyPage() {
  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }`}</style>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>IdeaByLunch</Link>
        <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Get your free brief →</Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 24px 100px' }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#6E6E73', letterSpacing: '.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>Last updated: May 2026</p>
          <h1 style={{ fontSize: 44, fontWeight: 800, color: '#1D1D1F', letterSpacing: '-2px', margin: '0 0 16px', lineHeight: 1.05 }}>Privacy Policy</h1>
          <p style={{ fontSize: 17, color: '#6E6E73', margin: 0, lineHeight: 1.6 }}>
            IdeaByLunch is built by a small team. We collect what we need to run the service, nothing more. This page explains exactly what that means.
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, padding: '36px 40px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
          <Section title="1. What we collect">
            <P>When you use the free brief tool, we collect the idea text you submit. We use this to generate your brief and to improve the service.</P>
            <P>If you pay for a site or product, we collect your name and email address to deliver and communicate about your order. Payment is handled by Stripe or Paystack — we never see your card details.</P>
            <P>We collect standard server logs (IP address, browser type, pages visited) for security and debugging. These are not linked to your identity unless you are a paying customer.</P>
          </Section>

          <Section title="2. Cookies and tracking">
            <P>We use minimal cookies required for the site to function. We do not use advertising cookies or third-party tracking pixels.</P>
            <P>We may use Vercel Analytics (privacy-first, no fingerprinting) to understand which pages are visited. No personal data is collected by analytics.</P>
          </Section>

          <Section title="3. How we use your data">
            <P>Your idea text is used to generate your brief. It may be used in aggregate, anonymised form to improve our AI outputs. We will never publish your idea or share it with third parties.</P>
            <P>Your email is used to deliver your order, send project updates, and — if you opt in — occasional product announcements. You can unsubscribe at any time.</P>
          </Section>

          <Section title="4. Who we share data with">
            <P>We use the following third-party services to operate the site:</P>
            <ul style={{ paddingLeft: 20, margin: '0 0 12px' }}>
              <li style={{ marginBottom: 8 }}><strong>Stripe / Paystack</strong> — payment processing</li>
              <li style={{ marginBottom: 8 }}><strong>Resend</strong> — transactional email delivery</li>
              <li style={{ marginBottom: 8 }}><strong>Vercel</strong> — hosting and edge compute</li>
              <li style={{ marginBottom: 8 }}><strong>Upstash</strong> — session and counter data</li>
              <li style={{ marginBottom: 8 }}><strong>OpenRouter / Anthropic</strong> — AI brief generation</li>
            </ul>
            <P>We do not sell your data to anyone, ever.</P>
          </Section>

          <Section title="5. Data retention">
            <P>Brief submissions are retained for up to 90 days for support purposes, then deleted. Order data is retained as required by accounting law (typically 7 years). You can request deletion of your personal data at any time by emailing <a href="mailto:hello@ideabylunch.com" style={{ color: '#0066CC' }}>hello@ideabylunch.com</a>.</P>
          </Section>

          <Section title="6. Your rights">
            <P>You have the right to access, correct, or delete any personal data we hold about you. Email us at <a href="mailto:hello@ideabylunch.com" style={{ color: '#0066CC' }}>hello@ideabylunch.com</a> and we will respond within 5 business days.</P>
          </Section>

          <Section title="7. Contact">
            <P>Questions about this policy: <a href="mailto:hello@ideabylunch.com" style={{ color: '#0066CC' }}>hello@ideabylunch.com</a></P>
          </Section>
        </div>

        <div style={{ marginTop: 40, display: 'flex', gap: 24, justifyContent: 'center' }}>
          <Link href="/terms" style={{ fontSize: 14, color: '#6E6E73', textDecoration: 'none' }}>Terms of Service</Link>
          <Link href="/" style={{ fontSize: 14, color: '#6E6E73', textDecoration: 'none' }}>← Back to home</Link>
        </div>
      </div>
    </>
  )
}
