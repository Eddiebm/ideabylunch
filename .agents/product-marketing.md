# Product Marketing Context

**Document version:** v1
**Last updated:** 2026-10-04

> Auto-drafted from the codebase (`app/page.tsx`, `app/layout.tsx`, `app/lib/pricing.ts`, `app/refer`, `app/alternatives`, `SERVICE_DEFINITION.md`, `BUILD_PLAN.md`).
> Items marked **[CONFIRM]** are inferred or conflict between sources: answer these before using other skills.

## Open question: who is this for? [CONFIRM]

The codebase currently tells three different stories:

| Source | Positioning | Customer |
|--------|-------------|----------|
| Homepage hero, FAQ, JSON-LD | "AI Marketplace Launch + Growth OS" | Founders launching a marketplace |
| Site title/meta (`layout.tsx`), `/niche/*` pages | "Become a founder by lunch", idea → brief → live site | Any first-time founder (AI SaaS, fintech, B2B SaaS, edtech, marketplace) |
| `SERVICE_DEFINITION.md`, `BUILD_PLAN.md` | Done-for-you website in 48h, $299 + $97/mo | Local small businesses without a website (plumbers, salons, restaurants; Ghana first) |

This draft assumes the **homepage (marketplace founders)** is the current direction, since it is the most recent and most specific. Pick one; the others become secondary segments or get cut.

## Product Overview
**One-liner:** Launch your marketplace by lunch. Grow it every day after.
**What it does:** Turns a plain-English marketplace idea into a live, deployed marketplace (pages, categories, listing templates, seller onboarding, buyer lead capture, admin dashboard, payment readiness), then runs an AI growth coach that tells the founder what to do each week to get sellers listing and buyers transacting.
**Product category:** Marketplace launch platform / AI marketplace builder. Customers likely search "how to start a marketplace", "marketplace builder", "Sharetribe alternative", "build a marketplace with AI". [CONFIRM]
**Product type:** Productised service + SaaS (one-time launch build, then monthly subscription).
**Business model:**
- Free founder brief (no card).
- Launch Package: one-time setup, $299 in the US.
- Growth OS: $97/mo in the US (hosting, AI growth recommendations, ongoing improvements, seller/buyer metrics). Cancel anytime.
- Full Product tier: $1,499 (US).
- Prices localised for 12 markets (US, GB, AU, CA, AE, MX, ZA, PH, KE, NG, IN, GH), e.g. Nigeria $79 + $19/mo, India $49 + $15/mo.
- Referral program: 30% of every payment, recurring on Grow, no cap.

## Target Audience
**Target companies:** Solo or very early founders (pre-revenue, no technical co-founder) validating a two-sided marketplace idea.
**Decision-makers:** The founder themself. Non-technical or time-poor.
**Primary use case:** Get a real marketplace live fast and get past the empty-marketplace stage (no sellers, no buyers).
**Jobs to be done:**
- Get my marketplace idea live without hiring developers or learning to code.
- Tell me exactly what to do next so sellers list and buyers show up.
- Let me test whether this marketplace can work before I sink months into it.
**Use cases:**
- Service marketplaces
- Local business directories
- Rental marketplaces
- Expert networks
- Vendor directories
- Community marketplaces
- Niche B2B marketplaces
- Event & vendor marketplaces

## Personas
B2C-style single buyer; personas not needed. [CONFIRM if you sell to agencies or accelerators]

## Problems & Pain Points
**Core problem:** Most marketplace ideas die after the website launches. Founders can get a site online; they can't recruit sellers, attract buyers, create liquidity, follow up with leads, or know what to do next.
**Why alternatives fall short:**
- Website builders build pages but don't understand marketplaces (no seller flow, buyer flow, or liquidity help).
- AI app builders (Lovable, Bolt, v0, Base44, Replit) generate apps but leave the founder alone after launch.
- Agencies/freelancers are slow and expensive for an unvalidated idea. [CONFIRM]
**What it costs them:** Months and money spent on a marketplace that never gets its first transaction.
**Emotional tension:** "The marketplace is live. Nobody is listing anything." / "You built the site. Now what? Nobody tells you."

## Competitive Landscape
**Direct:** Lovable, Bolt, v0, Base44, Replit (you already have `/alternatives/*` pages for these). Fall short because they build software but don't help operate or grow a marketplace.
**Direct (marketplace-specific):** Sharetribe, marketplace templates/plugins. [CONFIRM: not referenced in the code yet; worth an alternatives page if these are who prospects compare you with]
**Secondary:** Wix, Squarespace, Webflow. Fall short because they only build pages.
**Indirect:** Hiring an agency or freelancer; doing nothing and "keep thinking about it".

## Differentiation
**Key differentiators:**
- Marketplace-specific: seller onboarding, buyer capture, listings, liquidity mechanics built in.
- AI growth coach with a weekly action plan after launch.
- Speed: brief in 60 seconds, system live within hours.
- Full ownership: Vercel project, GitHub repo, and domain transferred to the founder. No lock-in.
- Master build prompt so the founder can keep building in Claude Code, Cursor, or Codex.
- Local pricing for emerging markets.
**How we do it differently:** Launch plus an operating layer, not just a website.
**Why that's better:** The founder gets past launch to actual transactions.
**Why customers choose us:** [CONFIRM: needs real customer answers]

## Objections
| Objection | Response |
|-----------|----------|
| "Is this just a website?" | No. The site is the front door; you also get onboarding flows, lead capture, admin tools, analytics, and growth recommendations. |
| "Why not Wix, Lovable, Bolt, or Base44?" | They generate sites/apps. IdeaByLunch is focused on marketplace launch and growth: seller onboarding, buyer capture, liquidity, and a coach that says what to do next. |
| "Am I locked in?" | No. You own the code, the repo, and the domain. |
| "Do I need to code?" | No. You get a live marketplace, plus a build prompt if you want to keep building. |
| "Do you handle payments?" | Built payment-ready; processor setup (e.g. Stripe) depends on your model. |

**Anti-persona:** Funded startups with an engineering team; founders who need a native mobile app, complex custom features, or multi-tenant/white-label setups; people "playing with templates" rather than validating a real marketplace. [CONFIRM]

## Switching Dynamics
**Push:** Built a site (or tried an AI builder) and still have no sellers or buyers; overwhelmed by what to do next.
**Pull:** Live by lunch, marketplace-specific flows, a weekly to-do list, you own everything, low founder-friendly price.
**Habit:** "I'll keep planning / build it myself / wait for a technical co-founder."
**Anxiety:** Will AI-built quality be good enough? Is $97/mo worth it before I have revenue? What happens if I cancel?

## Customer Language
**How they describe the problem:** [CONFIRM: need verbatim quotes from real founders. Sources: support emails, WhatsApp chats, briefs submitted on the site, Reddit threads]
**How they describe us:** [CONFIRM]
**Words to use:** marketplace, launch, live, sellers, buyers, listings, liquidity, own everything, by lunch, cook my idea, next move
**Words to avoid:** [CONFIRM] Probably "template", "website builder" (you position against those)
**Glossary:**
| Term | Meaning |
|------|---------|
| Brief | Free founder brief generated from the idea |
| Growth OS | Monthly subscription: hosting + AI growth recommendations + metrics |
| Launch Package | One-time build of the marketplace |
| Liquidity | Enough active sellers and buyers that transactions actually happen |

## Brand Voice
**Tone:** Confident, plain-spoken, a bit cheeky ("Cook my idea", "Or you can keep thinking about it.")
**Style:** Direct, short sentences, founder-to-founder, Apple-clean visual style
**Personality:** Fast, honest ("The honest answers."), practical, founder-friendly, no-nonsense

## Proof Points
**Metrics:** Live "marketplaces launched" counter on the homepage (from deploy count). [CONFIRM current number]
**Customers:** None cited yet. [CONFIRM]
**Testimonials:** None yet. Collecting 3–5 real ones is a priority.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Speed | Brief in 60 seconds; live within hours |
| Ownership | Repo, Vercel project, and domain transferred to you |
| Beyond launch | Weekly AI action plan; Growth OS dashboard |
| Affordable | $299 launch; local pricing in 12 markets |

## Goals
**Business goal:** [CONFIRM] Assumed: first paying marketplace founders, then recurring Growth OS revenue (BUILD_PLAN target: 100 customers ≈ $6,800/mo recurring).
**Conversion action:** Click "Cook my idea", generate the free brief, then buy the Launch Package (+ Growth OS).
**Current metrics:** [CONFIRM] Funnel tracking exists (`FunnelBeacon`, admin digest). Visitors/mo, briefs/mo, brief→paid rate, paying customers?

## Changelog
*Newest first. One line per revision: what changed and why.*
- v1 (2026-10-04) — Initial context, auto-drafted from the codebase; open positioning question flagged.
