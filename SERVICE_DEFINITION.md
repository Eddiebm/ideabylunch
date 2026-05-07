# ideaByLunch — Service Definition
*Internal reference. Not published.*

---

## What "done" means for each tier

### Launch — $299 one-time + $97/mo

**Included:**
- Single-page website generated from the brief (one design style, customer-chosen)
- Deployed to Vercel under a `*.vercel.app` subdomain
- Custom domain connected within 24 hours of deployment (purchased via Cloudflare, DNS propagated)
- SSL certificate (automatic via Vercel)
- Contact form wired to customer's email via Formspree or Resend (no backend)
- Mobile responsive
- Google Fonts, real Unsplash photography embedded
- One round of copy edits (headline, subheadline, CTA) requested via email within 7 days of delivery

**Not included:**
- Auth / login
- Database
- Payments on customer's site
- Blog with CMS
- More than 1 page
- SEO beyond meta tags and Open Graph
- Custom illustrations or logo
- Any feature not in the brief at time of payment

**48-hour clock:**
- Starts when Stripe/Paystack payment is confirmed (webhook fires)
- Runs in business hours: Mon–Fri, 06:00–22:00 GMT
- Paused if customer hasn't supplied required info (domain name, contact email for form)
- "Done" = live URL delivered via email and WhatsApp

---

### Full Product — $1,499 one-time + $97/mo

**Included — everything in Launch, plus:**
- Up to 5 pages (Home, About, Services, Blog index, Contact)
- Auth (Clerk — email/password + Google OAuth)
- Database (Supabase — schema designed from PRD, up to 5 tables)
- Stripe payments wired on customer's site (checkout for one product/service)
- Custom design system (Google Fonts pairing, color tokens, spacing scale — documented in a Notion page)
- GitHub repository in customer's own GitHub account (transferred, not forked)
- Vercel project transferred to customer's own Vercel account
- 30 days of support via email: bug fixes, copy changes, minor feature tweaks (under 2 hours each)
- One Loom walkthrough video of the codebase (under 15 minutes)

**Not included:**
- Mobile apps (iOS/Android)
- Custom AI features
- Third-party API integrations beyond Stripe + Clerk + Supabase
- Ongoing feature development after 30-day support window
- White-labelling or multi-tenant setups
- GDPR data processing agreements (customer's responsibility)

**72-hour clock** (not 48):
- Same business hours rule as Launch
- Paused pending customer decisions (brand colors, domain, Clerk/Supabase account setup)

---

## Handoff checklist (both tiers)

Before marking an order complete:

- [ ] Live URL resolves over HTTPS
- [ ] Custom domain connected and propagated (or customer notified it's in progress)
- [ ] Confirmation email sent with live URL
- [ ] WhatsApp message sent if number was provided
- [ ] GitHub repo transferred (Full Product only)
- [ ] Vercel project transferred (Full Product only)
- [ ] Supabase project transferred (Full Product only)
- [ ] Loom walkthrough sent (Full Product only)
- [ ] 30-day support window start date recorded in Redis order record

---

## What the $97/mo covers

- Domain renewal (prorated, ~$2.40/mo of the $97)
- Vercel hosting (cost: $0 — covered by our plan)
- Uptime monitoring (ping every 5 min, auto-alert)
- One content update per month: text changes, new photo, swap a section (up to 1 hour)
- Security patches if Next.js/framework CVEs require a redeploy

**Does not cover:**
- New pages or features
- Design changes
- A second domain
- Moving to a different hosting provider

Cancellation: customer keeps their site files and GitHub repo. Domain transfers out at cost (~$10). Hosting goes dark 30 days after last paid month unless they self-host.

---

## Scope creep rules

1. Any request that takes more than 30 minutes gets a quote before we touch it.
2. "Can you just add X" during build = out of scope. Quote it separately.
3. If the brief changes after payment, the 48-hour clock resets from the change confirmation.
4. One round of edits is included. A second round is $49 flat.

---

## What we do NOT promise

- A specific Lighthouse score
- First-page Google ranking
- Conversion rate outcomes
- Uptime SLA beyond "best effort" (no credits for downtime)
- Compatibility with every browser (support: Chrome, Safari, Firefox — last 2 major versions)
