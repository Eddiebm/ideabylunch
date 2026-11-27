# Premium Creative Excellence Initiative

**Branch:** `feature/premium-creative-excellence`  
**Goal:** Make IdeaByLunch capable of consistently producing exceptional, original, commercially effective websites that compete with professional digital agencies.

---

## Generation Paths (complete map)

| Path | File | Runtime | Stream | Purpose |
|------|------|---------|--------|---------|
| `/api/generate` | `app/api/generate/route.ts` | edge | SSE | Brief/idea generation |
| `/api/build-website` | `app/api/build-website/route.ts` | nodejs (maxDuration 300) | SSE | 5-style visual website builder |
| `/api/free-build` | `app/api/free-build/route.ts` | nodejs | No | Calls lib/generate → deploys to Vercel |
| `/api/hunt/build` | `app/api/hunt/build/route.ts` | edge | No | Local business site (Redis preview) |
| `lib/generate.ts` | `app/lib/generate.ts` | nodejs | No | Shared util; called by free-build |

## Publication Paths (complete map)

| Path | Mechanism | Automated? |
|------|-----------|-----------|
| `/api/launch` | Sends inquiry emails to Eddie | Manual fulfillment |
| `/api/free-build` → `lib/deploy.ts` | Vercel API deploy | Yes (preview → needs promotion) |
| `/api/order` + Stripe webhook | Stripe checkout, Redis order | Triggers `free-build` on paid |
| `/api/hunt/build` | Redis `preview:token` → `/preview/[token]` | Serves 30-day preview |

---

## Confirmed Defects

### D-001: SSE Parser loses data on chunk boundaries (FIXED)
**File:** `app/app/WebsitePreview.tsx`, `streamBuild()` function  
**Root cause:** `decoder.decode(value, { stream: true }).split('\n')` accumulates text in the decoder but discards the incomplete line at the end of each chunk — it's never buffered for the next read.  
**Scenario:** Chunk 1 ends mid-SSE line: `data: {"delta":{"te` → that partial line is processed as a non-`data:` line and silently dropped.  
**Fix:** `app/lib/parseSSE.ts` — stateful line buffer maintained across reads.  
**Test:** `__tests__/parseSSE.test.ts`

### D-002: Contradictory/duplicate creative prompts (FIXED)
**Files:** `app/api/build-website/route.ts` (5 prompts), `app/lib/generate.ts` (1 prompt), `app/api/hunt/build/route.ts` (1 inline prompt)  
**Root cause:** Three independent prompt authors, no shared contract. E.g., lib/generate shadows are `0 10px 40px rgba(0,0,0,0.08)` (alpha 0.31) while IMPECCABLE_CRAFT_RULES says "alpha never exceeds 0.15".  
**Fix:** Shared `GENERATION_CONTRACT` constants in `app/lib/generationContract.ts`.

### D-003: `build-website` route lacks testimonials fabrication guard (FIXED)
**File:** `app/api/build-website/route.ts`, all 5 style system prompts  
**Root cause:** Prompts say "social proof" section but don't prohibit inventing names, companies, quotes.  
**Fix:** `TESTIMONIALS_GUARD` constant added to every style prompt via `IMPECCABLE_CRAFT_RULES`.

### D-004: No AI quality gate on streaming builds (FIXED)
**File:** New `app/api/ai/critique/route.ts`  
**Root cause:** `lib/generate.ts` has a basic section-presence check; streaming builds in `build-website` have zero validation.  
**Fix:** `/api/ai/critique` endpoint scores HTML against 10 acceptance gates; `app/lib/acceptanceGates.ts` defines the contract.

---

## Acceptance Gates

A website PASSES delivery if ALL gates pass:

| ID | Gate | Verification |
|----|------|-------------|
| G-01 | Contains `<!DOCTYPE html>` | String presence |
| G-02 | Has all required sections (nav, hero, how-it-works, features, social-proof, pricing, cta, footer) | Lowercase string scan |
| G-03 | No banned CSS patterns (gradient text, glassmorphism, neon glow, elastic easing) | Regex |
| G-04 | No fabricated testimonials (AI-critiqued) | AI critique route |
| G-05 | No unsupported business claims (AI-critiqued) | AI critique route |
| G-06 | HTML length ≥ 15,000 chars (not truncated) | Length check |
| G-07 | Google Fonts @import present | String presence |
| G-08 | No placeholder URLs (lorempixel, via.placeholder, example.com) | Regex |
| G-09 | No inline `<style>` omission (all CSS must be inline) | Heuristic |
| G-10 | Responsive (contains `@media` or viewport meta) | String presence |

---

## Pipeline: Generate → Critique → Revise

### `/api/ai/critique` route
- Input: `{ html: string, brief: string, productName: string }`
- Runs G-01 through G-10 (structural gates immediately; AI gates via OpenRouter)
- Returns: `{ score: number, gates: GateResult[], issues: string[], pass: boolean }`
- Used by: `build-website` route (optional second-pass on completed HTML)

### Bounded revision loop (server-side)
- Max 2 revision passes
- Revision triggered when score < 70 or any critical gate fails (G-04, G-05, G-06)
- Revision prompt includes: original brief + generated HTML + critique issues
- Never retries more than once per style to control cost

---

## Open Items

- [ ] Real browser screenshot evaluation (requires Puppeteer on Node.js route — `app/api/screenshot/route.ts`)
- [ ] Wire critique into `build-website` streaming route (post-stream, non-blocking)
- [ ] Admin dashboard showing gate scores per generated site
- [ ] `app/api/free-build` to run acceptance gates before deploying to Vercel
- [ ] Promote-to-production gate: G-04 and G-05 must pass before `deployToVercel()` promotes

---

## Progress Log

| Date | Commit | Work |
|------|--------|------|
| 2026-11-27 | 26326f5 | D-001: SSE parser fix + 13 regression tests. D-002/D-003: generationContract.ts, TESTIMONIALS_GUARD on all 5 prompts, QUALITY_FLOOR on DEFAULT. |
| 2026-11-27 | 96739d2 | D-004: acceptanceGates.ts (10 structural gates), /api/ai/critique route (AI judge for G-04/G-05). |
