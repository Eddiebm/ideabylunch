# Product Marketing Context

**Document version:** v2
**Last updated:** 2026-10-04

> Drafted from the codebase (`app/layout.tsx`, `app/niche`, `app/alternatives`, `app/page.tsx`, `app/lib/pricing.ts`, `app/refer`) plus founder answers.
> Items marked **[CONFIRM]** are still inferred.

## Product Overview
**One-liner:** Become a founder by lunch.
**What it does:** A first-time founder describes their idea in plain English. IdeaByLunch gives them a free founder brief (vision, ideal customer, go-to-market plan, positioning, and a master build prompt), then builds and deploys a real, live product they own. After launch, an AI growth coach tells them what to do next each week.
**Product category:** AI startup builder / idea-to-MVP. Customers search "turn my idea into a startup", "build my MVP", "startup idea validator", "Lovable alternative", "build an app without coding". [CONFIRM]
**Product type:** Productised service + SaaS (free brief → one-time launch build → monthly Growth OS).
**Business model:**
- Free founder brief (no card). This is the lead magnet and top of the funnel.
- Launch Package: one-time, $299 in the US.
- Full Product tier: $1,499 in the US.
- Growth OS: $97/mo in the US (hosting, AI growth recommendations, ongoing improvements, metrics). Cancel anytime.
- Prices localised for 12 markets (US, GB, AU, CA, AE, MX, ZA, PH, KE, NG, IN, GH), e.g. Nigeria $79 + $19/mo, India $49 + $15/mo.
- Referral program: 30% of every payment, recurring on Grow, no cap.

## Target Audience
**Target companies:** First-time, pre-revenue founders with an idea and no technical co-founder. Strong fit in Africa and the diaspora (examples throughout the site: Lagos, Paystack, WAEC/JAMB, pidgin, diaspora food). [CONFIRM: primary geography]
**Decision-makers:** The founder themself. Non-technical or time-poor; often still employed.
**Primary use case:** Go from "I have an idea" to a live product and a plan, in hours instead of months, without hiring developers.
**Jobs to be done:**
- Help me turn my idea into something real I can show people today.
- Tell me who my customer is and how to reach them.
- Let me test whether the idea works before I quit my job or spend my savings.
**Use cases (verticals with existing `/niche/*` pages):**
- AI SaaS
- Fintech
- B2B SaaS
- Marketplaces
- Edtech
- Healthtech
- Climate
- AI-native agency replacement

## Personas
Single buyer (the founder); B2B personas not needed.

## Problems & Pain Points
**Core problem:** First-time founders get stuck between idea and launch. They don't know what to build first, who it's for, or how to get it built, and the idea dies in a notes app.
**Why alternatives fall short:**
- AI app builders (Lovable, Bolt, v0, Base44, Replit) build software, but the founder still has to know what to build, who it's for, and how to sell it.
- Agencies and freelancers are slow and expensive for an unvalidated idea ("Replace a $40k agency engagement").
- Courses and accelerators teach, but don't ship anything.
- Website builders make pages, not businesses.
**What it costs them:** Months of delay, money spent on developers before the idea is validated, and often the idea itself.
**Emotional tension:** Fear of wasting savings, impostor syndrome about not being technical, frustration at watching time pass. "Or you can keep thinking about it."

## Competitive Landscape
**Direct:** Lovable, Bolt, v0, Base44, Replit. Fall short because they need the founder to know what to build and leave them alone after launch. (`/alternatives/*` pages exist for all five.)
**Secondary:** Freelancers/agencies, no-code builders (Bubble, Webflow, Wix). Slow, expensive, or still need the founder to design the product.
**Indirect:** Startup courses, accelerators, ChatGPT conversations, doing nothing.

## Differentiation
**Key differentiators:**
- The founder layer: a strategy brief (customer, go-to-market, positioning) comes before the code, free.
- Done for you: a live, deployed product, not a tool you have to learn.
- Speed: brief in 60 seconds, live by lunch.
- Full ownership: GitHub repo, Vercel project and domain transferred to the founder. No lock-in.
- Master build prompt so they can keep building in Claude Code, Cursor or Codex.
- Local pricing for emerging markets; examples rooted in African markets.
- AI growth coach after launch.
**How we do it differently:** Strategy + build + growth in one, aimed at first-timers.
**Why that's better:** First-time founders don't need another tool; they need someone to tell them what to build and then build it.
**Why customers choose us:** [CONFIRM after first customers]

## Objections
| Objection | Response |
|-----------|----------|
| "Why not just use Lovable/Bolt myself?" | You can, if you already know what to build and who it's for. IdeaByLunch figures that out first, builds it for you, and stays with you after launch. |
| "Is AI-built quality good enough?" | It's a real, deployed product you own. Use it to validate; keep building with the master prompt. [CONFIRM: add example builds] |
| "Am I locked in?" | No. You own the code, repo and domain. |
| "Do I need to code?" | No. |
| "Is $97/mo worth it before revenue?" | Growth OS is optional; the brief is free and the launch is one-time. |

**Anti-persona:** Funded startups with engineers; founders needing native mobile apps or complex custom systems; people who want to learn to code themselves.

## Switching Dynamics
**Push:** Idea sitting untouched for months; quotes from developers they can't afford; AI builder attempts that stalled.
**Pull:** Free brief, live by lunch, you own everything, priced for their market.
**Habit:** "I'll do it when I have more time / money / a technical co-founder."
**Anxiety:** Will it look amateur? Is this a scam? What happens to my idea and code?

## Customer Language
**How they describe the problem:** [CONFIRM: collect verbatim from briefs submitted on the site, WhatsApp, Reddit/X founder threads]
**How they describe us:** [CONFIRM]
**Words to use:** idea, founder, by lunch, live, launch, brief, you own everything, cook my idea
**Words to avoid:** [CONFIRM] Probably "no-code", "template", "MVP" for non-technical readers
**Glossary:**
| Term | Meaning |
|------|---------|
| Founder brief | Free AI brief: vision, ICP, go-to-market, positioning, master build prompt |
| Launch Package | One-time build and deploy of the product |
| Growth OS | Monthly subscription: hosting + AI growth recommendations + metrics |
| Master build prompt | Prompt to continue building in Claude Code, Cursor or Codex |

## Brand Voice
**Tone:** Confident, plain-spoken, a bit cheeky ("Cook my idea", "Or you can keep thinking about it.")
**Style:** Direct, short sentences, founder-to-founder
**Personality:** Fast, honest, practical, encouraging, no-nonsense

## Proof Points
**Metrics:** Live deploy counter on the homepage. [CONFIRM current number]
**Customers:** None yet.
**Testimonials:** None yet. Priority: get 3–5 from the first users, even free ones.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Speed | Brief in 60 seconds; live within hours |
| Ownership | Repo, Vercel project and domain transferred |
| Strategy first | Founder brief with ICP and go-to-market |
| Affordable | $299 launch; local pricing in 12 markets |

## Goals
**Business goal:** First 10 paying customers.
**Conversion action:** "Cook my idea" → free brief → Launch Package.
**Current metrics:** 0 paying customers. Funnel tracking exists (`FunnelBeacon`, admin digest). [CONFIRM visitors/mo and briefs/mo]

## Changelog
*Newest first. One line per revision: what changed and why.*
- v2 (2026-10-04) — Repositioned from marketplace founders to any first-time founder (founder's decision); goal set to first 10 paying customers.
- v1 (2026-10-04) — Initial context, auto-drafted from the codebase; open positioning question flagged.
