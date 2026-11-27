# CREATIVE_INTELLIGENCE.md
## IdeaByLunch — Engineering Record
*Created: 2026-11-27 · Mission: Transform from prompt-to-code generator into a visually intelligent, self-evaluating platform*

---

## 1. Architecture Audit

### 1.1 Generation Paths — Current State

Three distinct generation pipelines exist in the codebase, **none connected to the others**:

| Path | Route | Model | Trigger | Context |
|------|-------|-------|---------|---------|
| **A — Free/Live** | `POST /api/build-website` | Gemini 2.5 Flash (stream) | WebsitePreview.tsx → user previews | 5 style systems, SSE stream, up to 32k tokens |
| **B — Paid delivery** | `POST /api/webhook` (Stripe/Paystack) | Flash → Pro → Claude Sonnet by tier | Payment confirmed | Tier-based model routing, non-streaming |
| **C — Free-build** | `POST /api/free-build` | `generateHtmlFromBrief()` in `lib/generate.ts` | Admin token | Separate prompt, different quality rules |

**Problem:** These three paths have divergent prompts, quality floors, model choices, and style rules. A site generated via path A and one via path B from the same brief will look entirely different. No shared source of creative truth.

### 1.2 Style Systems (Path A — `build-website`)

Five style prompts defined inline in `api/build-website/route.ts`:

| Key | Design target | Fonts | Notes |
|-----|--------------|-------|-------|
| `default` | "Kinfolk-magazine sensibility" | Playfair/Cormorant/Baskerville + Lora/DM Sans/Inter | Photo-first, editorial |
| `editorial` | Impeccable design system | Cormorant Garamond + Instrument Sans | Strict oklch palette, most prescriptive |
| `minimal` | Stripe/Linear aesthetic | Inter only | Apple gray surfaces |
| `bold` | Awwwards high-energy | Archivo Black + DM Sans | Full-bleed color blocks |
| `bespoke` | AI-invented per brief | AI chooses | Most creative latitude |

**Problems:**
- All five prompts embed the same `QUALITY_FLOOR` and `TESTIMONIALS_GUARD` via string interpolation — a text contract, not a code contract. Drift occurs whenever prompts are edited independently.
- `editorial` ("Impeccable") has stricter color rules (oklch) than the others, so the same `QUALITY_FLOOR` check passes against inconsistent standards.
- `default` instructs "Kinfolk-magazine sensibility" and `bold` says "Awwwards-winner" — subjective aesthetic targets that the model cannot reliably hit without reference imagery or scored examples.

### 1.3 Style Systems (Path B — `webhook`)

Tier-based model routing with a **different** style prompt embedded directly in the webhook handler:

```
starter:      Gemini Flash  · 24k tokens
professional: Gemini Pro    · 32k tokens  
premium:      Claude Sonnet · 32k tokens
```

The webhook prompt is entirely separate from the five styles in `build-website`. Starter customers see a different generation than the preview they approved. **This is a trust defect.**

### 1.4 Style Systems (Path C — `lib/generate.ts`)

A third, independent system prompt: "Stripe-level polish. Modern premium SaaS aesthetic." Uses Inter only. Distinct from all five path-A styles and the webhook prompt.

**Current model count across all generation paths:**
- `google/gemini-2.5-flash` — 14 call sites
- `google/gemini-2.5-pro` — 1 (webhook professional tier)
- `anthropic/claude-sonnet-4.5` — 1 (webhook premium tier)  
- `dall-e-3` — 1 (logo generation)
- OpenAI API client via OpenRouter — all calls

### 1.5 Imagery Pipeline

`POST /api/imagery` runs three sequential AI calls:
1. Gemini Flash → extract 5 specific Unsplash search queries from brief
2. 5 × Unsplash API fetch (parallelized) → royalty-free photos
3. Gemini Flash → generate AI image prompts (stored but not executed — no image generation model is called)

**Problems:**
- AI image prompts are generated but never used. No image generation model (DALL-E, Flux, Ideogram, Stability) is wired to actually produce custom imagery.
- Photos are sourced from Unsplash stock. The result is generic for most briefs.
- `imagery` route is edge runtime; `build-website` is Node runtime — they cannot share state within a request. Photos pass as URLs in the request body from client.

### 1.6 Evaluation — `acceptanceGates.ts` + `/api/ai/critique`

10 gates defined (G-01 through G-10):
- G-01: Valid DOCTYPE
- G-02: Required sections present (nav, hero, how, feature, pricing, footer)
- G-03: No banned CSS patterns (gradient text, glassmorphism, elastic easing, high shadow alpha)
- G-04: No fabricated testimonials (AI-judged)
- G-05: No unsupported claims (AI-judged)
- G-06: HTML not truncated (≥ 15,000 chars)
- G-07: Google Fonts imported
- G-08: No placeholder image URLs
- G-09: Inline CSS present
- G-10: Responsive (@media or viewport)

**Problems:**
- Gates are **text-only**. No screenshot, no browser render, no visual check. A site can pass all 10 gates and look like AI slop.
- G-04/G-05 use the same Gemini Flash model that generated the site — same provider, same training, correlated errors.
- An unavailable AI judge leaves G-04/G-05 as `false` (correctly conservative per the brief requirement), but the overall `pass` logic only requires score ≥ 70, so 8 of 10 gates still passes. G-04 and G-05 are in `CRITICAL_GATE_IDS` so they do block — but the judge failure path logs and continues rather than surfacing the failure prominently.
- Gates are **not wired to the generation loop** in production. The critique route exists but `WebsitePreview.tsx` and `webhook/route.ts` do not call it. Evaluation is opt-in dead code for most users.

### 1.7 WebsitePreview.tsx — Client Generation Flow

454-line client component. Flow:
1. `isDone` triggers `startDefault()` → fetches `/api/imagery` → streams `/api/build-website` with style `default`
2. After default completes, shows "Explore 4 Directions" button
3. User clicks → all 4 direction streams fire simultaneously (editorial/minimal/bold/bespoke)
4. User selects a design → `onDesignSelected(style, html)` callback

**Problems:**
- 5 simultaneous generation streams (default + 4 directions) = ~$0.50–$1.50 in model costs per preview session, regardless of whether user converts.
- No quality gate is applied to any of the streamed outputs before showing to user.
- Direction re-generation (retry button) creates a new AbortController without storing it, so the old stream may continue running.
- Selected HTML is passed up to parent via callback but no diff/comparison is preserved.
- No persistence of previously generated results — every page load re-generates.

### 1.8 Deployment Pipeline

`lib/deploy.ts`:
- `deployToVercel()` — deploys to **preview** target. Correct. Never directly to production.
- `promoteDeployment()` — promotes preview to production. Called from `webhook/route.ts` after payment confirmed.
- Webhook deploys automatically to production without human review step in paid flow.

**Problem:** The paid flow (Stripe webhook → generate → Vercel promote) has no human approval gate. The customer pays, the site generates, and it goes live without review. If generation fails or produces garbage, the customer receives a broken or low-quality site automatically.

### 1.9 Database / Persistence

- **Redis (Upstash)**: session tokens, rate limits, lead capture, order records, deploy stats, funnel tracking
- **No SQL database** for site storage — orders stored as JSON in Redis keys `order:{siteId}` with 90-day TTL
- **No HTML persistence** after delivery — generated HTML is not stored long-term
- Site preference data, style selection, evaluation scores: **not stored**

**Problem:** No learning loop is possible without storing evaluation outcomes. Every generation starts from zero context.

---

## 2. Identified Defects

### Critical (block visual quality)
| ID | Description |
|----|-------------|
| C-001 | Three divergent generation paths with incompatible prompts — same brief produces different sites |
| C-002 | No visual evaluation — gates are text-only, no screenshot/render comparison |
| C-003 | AI critique is dead code — not wired to generation loop for most users |
| C-004 | Paid delivery bypasses approved preview — webhook generates a new site, doesn't deliver the one the user selected |
| C-005 | AI image prompts generated but never executed — no custom imagery |

### Important (affect reliability)
| ID | Description |
|----|-------------|
| I-001 | No HTML persistence — generated sites cannot be re-evaluated or improved post-delivery |
| I-002 | 5 simultaneous streams on every preview — high cost per session, no caching |
| I-003 | Retry button in WebsitePreview leaks AbortControllers |
| I-004 | `generate/route.ts` has 8k token limit vs 32k in `build-website` — same model, inconsistent output length |
| I-005 | No preference storage — no feedback loop from human evaluation outcomes |

### Design Quality (direct cause of visual dissatisfaction)
| ID | Description |
|----|-------------|
| D-001 | Style prompts use subjective aesthetic targets ("Kinfolk-magazine", "Awwwards-winner") with no reference imagery, scored examples, or measurable criteria |
| D-002 | Quality floor is a text string — model compliance is unverified |
| D-003 | Imagery is Unsplash stock — not custom, not brand-specific, visually generic |
| D-004 | No art direction step before generation — visual concept goes directly to code without a design reference |
| D-005 | Evaluator uses same model family as generator — cannot provide independent critique |

---

## 3. Workstream Engineering Plan

### WS-1 ✅ Architecture Audit (this document)

### WS-2: Design Intelligence Library
**Location:** `app/lib/design-intelligence/`
- `references.ts` — structured design principles (composition, typography, color harmony, negative space, photography, hierarchy)
- `retrieval.ts` — brief → relevant principles lookup (keyword + category matching, no external DB needed initially)
- Schema: `{ id, category, principle, rationale, examples: string[], antiPatterns: string[] }`
- Categories: composition · typography · color · photography · hierarchy · industry-specific
- No proprietary designs reproduced — principles only

### WS-3: Visual-First Generation Pipeline (feature-flagged)
**New route:** `POST /api/generate-visual` (Node runtime, feature flag `VISUAL_PIPELINE_ENABLED`)

Steps:
1. Parse brief → extract business category, tone, audience
2. Retrieve design principles relevant to category
3. Art direction prompt → establish visual concept (typeface, palette, layout personality, photography direction) as a structured JSON artifact, NOT yet code
4. Image generation → Flux/Ideogram/DALL-E for concept imagery (gated: `IMAGE_GEN_ENABLED`)
5. HTML generation → system prompt includes the art direction JSON + image URLs
6. Browser screenshot → Playwright/serverless-chrome render of generated HTML
7. Visual evaluation → independent model (Claude Opus or GPT-4o Vision) scores rendered screenshot
8. If score < threshold AND iterations < limit → revise prompt with specific critique and re-generate
9. Final delivery of strongest-scoring version

**Feature flags (env vars):**
- `VISUAL_PIPELINE_ENABLED=true|false`
- `IMAGE_GEN_ENABLED=true|false`  
- `VISUAL_EVAL_ENABLED=true|false`
- `MAX_REVISIONS=2` (default)
- `VISUAL_SCORE_THRESHOLD=75`

### WS-4: Model Competition
**New module:** `app/lib/model-router.ts`
- Provider-independent interface: `generateSite(brief, style, provider) → Promise<string>`
- Supported providers: OpenRouter (Gemini Flash/Pro), Anthropic (Claude), OpenAI (GPT-4o)
- Benchmark results stored in Redis with brief hash as key
- Model selected per category based on historical performance, not hardcoded
- Never call every model per customer — route based on accumulated benchmark data

### WS-5: Independent Visual Criticism
**New route:** `POST /api/evaluate-visual` (Node runtime)
- Input: `{ html: string, brief: string, referenceImageUrl?: string }`
- Render HTML to screenshot via headless browser
- Score via vision-capable model (must be different provider from generator)
- Dimensions: composition · typography · originality · commercial clarity · mobile quality · brand alignment
- Returns: `{ score: number, dimensions: Record<string, number>, critique: string, suggestions: string[] }`
- An unavailable evaluator returns `{ score: null, error: "evaluator_unavailable" }` — never counts as pass

### WS-6: Preference Intelligence
**New table:** `design_preferences` in Neon (not Redis — needs persistence)
```sql
CREATE TABLE design_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text,                    -- nullable for anonymous
  session_id text NOT NULL,
  preference_type text NOT NULL,          -- 'pairwise' | 'rejection' | 'selection' | 'evaluation'
  style_a text,
  style_b text,
  preferred text,                         -- which won, or null
  rejected_characteristics jsonb,
  preferred_characteristics jsonb,
  evaluation_score numeric,
  created_at timestamptz DEFAULT now()
);
```
- Pairwise comparison: when user is shown two directions, record which they explore longer/select
- Rejection capture: when user clicks "Regenerate", record which style was rejected
- Aggregate into preference profile per email/session
- Use profile to bias generation parameters on next session

### WS-7: Technical Excellence
**New route:** `POST /api/verify` (Node runtime)
- Input: rendered HTML string + brief
- Run automated checks:
  - Responsive: check @media breakpoints, viewport meta
  - Navigation: all internal links resolve, nav renders at mobile
  - Forms/buttons: no broken onclick handlers, all form actions set
  - Fabrication: re-run G-04/G-05 with independent model
  - SEO: title, meta description, h1 present and brief-derived
  - Performance: image count, estimated DOM size
  - Security: no inline event handlers from user input, no eval()
- Returns structured report, not a boolean pass

### WS-8: Commercial Economics
**New module:** `app/lib/cost-tracker.ts`
- Track per-request: model, tokens in/out, provider, generation time, evaluation score, delivery status
- Store in Redis with 90-day TTL, aggregate daily
- Target: ≤ $15 AI spend per successful launch (experimental, not a hard limit)
- Alert when session cost exceeds $5 (single preview session)
- Cost-aware routing: use Flash for drafts, upgrade to Pro/Sonnet only if Flash score < threshold

### WS-9: Controlled Benchmarking
**New script:** `scripts/benchmark.ts`
- 12 diverse brief categories: food marketplace, freelance services, tutoring, luxury goods, local trades, digital products, healthcare services, creative marketplace, fitness, B2B SaaS, real estate, nonprofit
- Run each brief through: (A) current pipeline, (B) improved direct-code, (C) visual-first pipeline
- Record: generation time, cost, evaluation score (automated), HTML size, gate results
- Human preference survey: blind A/B/C rating (composition, typography, commercial credibility)
- Report: mean scores, confidence intervals, failure rates, cost per successful delivery
- Acceptance criteria: 75% human preference over current, 60% vs matched professional references, zero critical functional failures, no fabricated claims

### WS-10: Project Zero
- Once WS-3 (visual-first pipeline) passes WS-9 benchmark criteria, generate new ideabylunch.com homepage through the same pipeline
- The homepage becomes the first production deployment of the new system
- Document: brief used, art direction generated, evaluation scores, revisions required

---

## 4. Implementation Order

**Phase 1 — Foundation (no paid AI spend)**
1. Fix C-004: Wire paid delivery to deliver the selected preview HTML, not a new generation
2. Fix C-003: Call `/api/ai/critique` from WebsitePreview after each direction completes
3. Build WS-6 schema (Neon table) and WS-6 capture in WebsitePreview
4. Build WS-2 design intelligence library (static data, no AI cost)

**Phase 2 — Evaluation infrastructure (low spend)**
5. Build WS-5 visual evaluator using existing headless browser or Vercel OG screenshot service
6. Wire evaluator output to Redis storage for every generation
7. Begin accumulating baseline scores for current pipeline

**Phase 3 — Visual-first pipeline (requires authorization for image gen spend)**
8. Build WS-3 art direction step (text-only first, no image gen)
9. Build WS-4 model router
10. Add image generation behind `IMAGE_GEN_ENABLED` flag (requires spend authorization)
11. Full visual-first pipeline behind `VISUAL_PIPELINE_ENABLED` flag

**Phase 4 — Benchmarking**
12. Run WS-9 benchmark across 12 briefs
13. Calibrate automated scores against human preferences
14. Report results before any production changes

**Phase 5 — Project Zero**
15. Generate new homepage through proven pipeline
16. Deploy only after benchmark criteria met and visual design approved

---

## 5. What Must NOT Change

- Existing marketplace generation functionality (brief → website → Stripe checkout → Vercel deploy)
- Existing payment flows (Stripe, Paystack)
- Existing social distribution, grow/coach, hunt features
- Authentication and session management
- Redis schema for existing order records
- `export const runtime = 'edge'` on all existing edge routes
- IdeaByLunch independence — no Forge integration, imports, or references

---

*Last updated: 2026-11-27*  
*Author: Architecture audit via Claude Code*
