# PROJECT GALILEO — External Creative Technology Evaluation
*IdeaByLunch · Research Register · Started: 2026-11-27*

---

## Status
Last updated: 2026-11-27  
Research phase: Workstream 1 complete — Integration Feasibility  
Workstream 2–5: Pending budget authorization and C-004 completion

---

## Workstream 1 — Integration Feasibility

### v0 (Vercel)

**API availability: Production-ready**

The v0 API is available via self-serve API keys with no waitlist or beta status.

| Attribute | Detail |
|-----------|--------|
| Base URL | `https://api.v0.dev` (REST, /v1/ routes) |
| SDK | `npm install v0-sdk`; `createClient({ apiKey, baseUrl })` |
| Auth | API key (`V0_API_KEY`), created at v0.app/settings/keys |
| AI tools | `@v0-sdk/ai-tools` for Vercel AI SDK agent integration |
| Output | React components (shadcn/ui, Tailwind CSS). Raw HTML is not documented as a first-class output. |
| Deployment | Native Vercel deploy via `v0.deployments.create`. Deploy quota: 100/day. |

**Quotas (daily reset):**
- API requests: 10,000
- Chat messages: 1,000
- Deployments: 100
- File uploads: 1 GB
- Max files per chat: 1,000 (3 MB each)
- Max messages per chat: 10,000 (older messages archived)

**Pricing:**

| Plan | Monthly | Credits included | Notes |
|------|---------|-----------------|-------|
| Free | $0 | 7 messages/day | Limited |
| Plus | $30/user | $30/month + $2/day | All models |
| Business | $100/user | $30/month + $2/day | Training opt-out |
| Enterprise | Custom | Custom | SAML SSO, SLAs |

**Token pricing (USD per 1M tokens — Input / Cache write / Cache read / Output):**

| Model | Input | Cache write | Cache read | Output |
|-------|-------|-------------|------------|--------|
| v0 Mini | $0.10 | $0.125 | $0.01 | $0.50 |
| v0 Pro | $2.00 | $2.50 | $0.10 | $10.00 |
| v0 Max | $4.00 | $5.00 | $0.20 | $20.00 |
| v0 Max Fast | $8.00 | $10.00 | $0.40 | $40.00 |

**Cost per IdeaByLunch-equivalent generation** (32K output tokens, 2K input):

| Model | Cost estimate |
|-------|--------------|
| v0 Mini | ~$0.016 |
| v0 Pro | ~$0.324 |
| v0 Max | ~$0.648 |
| Gemini 2.5 Flash (current) | ~$0.019 (at $0.60/1M output) |

**Key finding:** v0 Mini costs similarly to Gemini Flash. v0 Pro/Max are 17–34× more expensive per generation.

**Architecture (from engineering posts):**
- Composite pipeline: RAG context retrieval → frontier base model (Sonnet 4 for v0-1.5-md) → Quick Edit model → streaming AutoFix (vercel-autofixer-01, Fireworks RL fine-tuned)
- Error-free generation: 93.87% (v0-1.5-md) vs 78.43% (Claude Opus 4) on internal benchmark
- LLM Suspense: rewrites imports and dependencies during streaming (100ms, no extra model call)
- Dynamic system prompt: injects framework version knowledge via embeddings

**Commercial terms:** No explicit data privacy terms visible in fetched pages. Business plan includes training opt-out. Enterprise includes "Data never used for training."

**Integration risk:** v0 outputs React components, not raw HTML. IdeaByLunch's current pipeline produces single-file HTML delivered to Vercel. Integrating v0 would require a React→HTML compilation step or switching to a React component delivery model. This is a significant architectural change.

---

### Google Stitch

**API availability: Early access / unclear GA status**

The Stitch blog post (March 18, 2026) describes an MCP server and SDK as "recently released." However, the main product page (stitch.google.com) renders via JavaScript and returned only its title when fetched. The MCP setup docs page also returned only its title. No API pricing, rate limits, or explicit GA status were extractable.

| Attribute | Detail |
|-----------|--------|
| Main page | stitch.google.com (redirected from stitch.withgoogle.com) |
| MCP server | stitch.withgoogle.com/docs/mcp/setup/ — setup docs exist but could not be rendered |
| SDK | github.com/google-labs-code/stitch-sdk |
| Skills | github.com/google-labs-code/stitch-skills |
| Output | UI designs, interactive prototypes; exports to AI Studio and Antigravity |
| Design system | DESIGN.md format for agent-friendly design rules, URL extraction |

**Features described in launch post:**
- Infinite AI-native canvas accepting images, text, or code as input
- Parallel design agent explorations via "Agent manager"
- Voice interaction for critiques and live edits
- Automatic next-screen generation from prototypes
- MCP server for integration into agent workflows

**What is unknown:**
- Actual API endpoint format and authentication
- Rate limits and quota
- Pricing (none stated)
- Whether the output is exportable as HTML or only as proprietary design format
- Whether the product is publicly available or invite-only

**Integration risk:** HIGH. The API is not documented enough to assess integration feasibility. Stitch appears to be a UI design tool, not a full website code generator. Even if the MCP works, translating Stitch designs into deployable HTML would require an additional step.

**Recommendation:** Cannot assess until the docs are readable and access is confirmed. Check stitch.google.com directly in a browser to determine current access status.

---

### OpenAI Image Generation → Website Implementation

**API availability: Production-ready**

DALL-E 3 is available at standard OpenAI API pricing. GPT-4o Vision can analyze images for website implementation.

| Capability | Status |
|-----------|--------|
| DALL-E 3 image generation | GA, $0.040–$0.080 per image (1024×1024 standard/HD) |
| GPT-4o Vision + code gen | GA, standard token pricing |
| Workflow | Generate hero/section images → pass to code model |

**Cost per site (image-first approach):**
- 3 hero images at $0.08 each: $0.24
- Code generation (Claude/GPT/Gemini) with images: ~$0.10–0.30
- Total: ~$0.34–0.54 per site

This is 18–28× more expensive than current Gemini Flash text-only generation.

---

## Workstream 2 — Comparison Plan

**Business brief for the comparison:** Use the IdeaByLunch homepage itself as the test brief. Identical brief across all candidates.

**Brief:** "IdeaByLunch — an AI marketplace builder. Brief a business idea in plain English. We generate a complete marketplace with pages, payments, search, and an AI growth engine in under 4 hours. Starter plan $299, Professional $499, Premium $999. Target audience: solo founders and small teams wanting to launch a marketplace business quickly."

| Candidate | Method | Approx cost | Status |
|-----------|--------|-------------|--------|
| A | Existing IdeaByLunch (Gemini Flash, 5 style prompts) | $0 (existing infra) | Ready |
| B | GPT-4o / GPT-6 with minimal creative prompt | ~$0.10–0.30 | Ready |
| C | Claude Sonnet/Opus with minimal creative prompt | ~$0.10–0.30 | Ready |
| D | Gemini 2.5 Flash/Pro with minimal creative prompt | ~$0.05–0.20 | Ready |
| E | v0 API (v0 Mini model) | ~$0.016–0.05 | Requires v0 API key |
| F | Google Stitch design → implementation | Unknown | Blocked on access |
| G | OpenAI DALL-E 3 images → website impl | ~$0.35–0.55 | Requires DALL-E budget auth |

**Budget for WS2 (2 runs per candidate):**
- Candidates A–D: ~$2–4 total
- Candidate E: ~$0.10 (v0 Mini) or ~$1.30 (v0 Max) — requires v0 API key
- Candidate F: Unknown — requires access confirmation
- Candidate G: ~$1.50–2.20 — requires explicit budget authorization

**Recommended immediate action:** Run candidates A–D (Claude, GPT, Gemini minimal prompts) since these require no additional infrastructure or access beyond existing OpenRouter API key. Total cost ~$2–4. Defer E, F, G until access and budget are confirmed.

---

## Workstream 3 — Blind Evaluation Protocol

**Methodology (informed by Contra Labs benchmark):**

Contra Labs used 35 professional designers and 4,311 pairwise votes. We cannot match that scale but can apply the same approach.

1. Generate candidates A–D (or more) from identical brief
2. Render each in a real browser at 1440px wide and 375px mobile
3. Capture consistent screenshots (same scroll position, same viewport)
4. Randomize and anonymize candidate labels
5. Present pairs to evaluators: "Which would you trust with $499?"
6. Dimensions to score: visual quality, originality, typography, commercial credibility, mobile usability

**AI Slop Detector:** Contra Labs uses a classifier with 0–100 "AI-looking" score that correlates with human preference at r=0.94. This suggests automated screening is viable as a proxy for human taste.

**Key finding from Contra Labs:** The best-performing public model (Claude Fable 5.2, Elo 1,714) won 70–73% of pairwise votes. The stealth model Gestalt (unreleased) won 89% of votes with Elo 1,928. There is a large gap between frontier models and average models.

---

## Workstream 4 — Commercial Feasibility (Preliminary)

### Cost comparison

| Approach | Per site cost | Monthly at 100 sites | Notes |
|----------|--------------|---------------------|-------|
| Current (Gemini Flash) | ~$0.019 | ~$1.90 | 32K output tokens |
| Minimal direct prompt (Claude/GPT) | ~$0.10–0.30 | ~$10–30 | Comparable quality possible |
| v0 Mini API | ~$0.016 | ~$1.60 | React output, not raw HTML |
| v0 Pro API | ~$0.32 | ~$32 | React output |
| v0 Max API | ~$0.65 | ~$65 | React output |
| Image-first (DALL-E + Claude) | ~$0.40–0.55 | ~$40–55 | Premium feel possible |

### Architecture options assessment

| Option | Feasibility | Quality potential | Cost | Risk |
|--------|-------------|------------------|------|------|
| Specialized external provider (v0) | Feasible (API available) | High (93.87% error-free) | Low–High depending on model | React-only output requires arch change |
| Minimal direct-model integration | Feasible today | Unknown until tested | Low | Low |
| Visual-first hybrid (DALL-E + LLM) | Feasible | Potentially high | Medium | Medium |
| Proprietary creative intelligence | Long-term | Unknown | Highest build cost | High |

### Key risks

**v0 integration:** Outputs React components. IdeaByLunch currently delivers single-file HTML. Switching to React delivery would require: (1) a build step, (2) dependency management, (3) changes to the Vercel deployment pipeline. Not a minor integration.

**Google Stitch:** Cannot evaluate until access is confirmed and API is documented. The tool appears oriented toward UI design iteration, not full-page code generation.

**Vendor lock-in:** v0 is Vercel-owned. Business plan required for training opt-out. For IdeaByLunch customer sites, generated code may be used for Vercel model training unless Business or Enterprise plan.

**Data privacy:** Customer business briefs passed to v0 API would be subject to Vercel's data use terms. Plus plan allows training use. Business plan ($100/user/month) enables training opt-out.

---

## Workstream 5 — Marketplace Verification

Deferred until WS2 comparison candidates are generated and evaluated. Must verify that the winning approach produces functional marketplace HTML, not just attractive landing pages. Specific checks required:

- Seller onboarding flow completeness
- Buyer journey and listing presentation
- Payment integration hooks (Stripe/Paystack placeholders)
- Customer account structures
- Compatibility with IdeaByLunch's existing deployment pipeline

---

## Research Literature Summary

### Design2Code (arXiv 2403.03163)

| Attribute | Detail |
|-----------|--------|
| Authors | SALT Lab, Stanford |
| Benchmark | 484 real webpages (Design2Code), 80-page HARD subset |
| Metrics | Block-Match, Text, Position, Color, CLIP scores |
| Best public result | GPT-4o: Avg 90.2 (Design2Code), 84.0 with self-refinement |
| Availability | Code, dataset (SALT-NLP/Design2Code-hf), model checkpoint (SALT-NLP/Design2Code-18B-v0) all public on HuggingFace |
| License | MIT (research use stated in README) |
| **IdeaByLunch relevance** | The benchmark methodology and dataset could be used to score IdeaByLunch-generated sites objectively. |

### VisRefiner (arXiv 2602.05998)

| Attribute | Detail |
|-----------|--------|
| Authors | Institute of Software, CAS |
| Approach | 7B model trained on visual differences between rendered output and reference; SFT + GRPO |
| Results | Design2Code: 89.3 Avg (vs GPT-4o 90.2). Design2Code-HARD: 86.3 (vs GPT-4o 84.0 — **beats GPT-4o**) |
| Multi-turn | Filtered multi-turn refinement reaches 94.2 at turn 5 |
| Availability | No public code or model mentioned |
| **IdeaByLunch relevance** | The visual-difference self-refinement approach (render → compare → edit) is directly applicable to IdeaByLunch's C-002 evaluation loop. The methodology is citable even without the trained model. |

### DCGen (10.1145/3729364)

| Attribute | Detail |
|-----------|--------|
| Access | 403 Forbidden from ACM DL — could not read |
| Secondary reference | From LiveWorkspace: Wan et al. 2025, decomposes screenshots into regions for code generation |
| Availability | Unknown |
| **IdeaByLunch relevance** | Region decomposition approach could inform a future multi-pass generation strategy |

### LiveWorkspace (arXiv 2611.12112)

| Attribute | Detail |
|-----------|--------|
| Authors | Nankai University, CAS Institute of Automation, Peking University, Guangzhou |
| Approach | Persistent "Shared Visual State" for target and current rendering; structured diffs guide code edits |
| Results (GPT-5.2) | Design2Code: 93.6 (+1.8 over control). Edit success: 93.0% vs 41% for direct editing |
| Availability | No public code or model mentioned |
| **IdeaByLunch relevance** | The structured diff approach could be a foundation for IdeaByLunch's visual refinement loop (C-002). The 93.0% vs 41% edit success gap demonstrates the value of visual state tracking. |

---

## Open Questions

**Access / authorization required:**
1. v0 API key — required to test Candidate E. Obtain at v0.app/settings/keys. What plan tier?
2. Google Stitch access — open stitch.google.com in a browser to determine whether it's publicly accessible or invite-only
3. OpenAI budget authorization — image-first approach (Candidate G) requires ~$2 for two runs

**Technical unknowns:**
4. Can v0 output raw HTML rather than React? (Check v0.app/docs/api/v2 and sdk README)
5. What does Stitch's MCP actually expose — design inspection tools, or code generation?
6. Is there a commercial license for the Design2Code dataset to use for systematic evaluation?

**Architecture decisions pending evidence:**
7. If v0 quality justifies cost: is React component output acceptable, or must it remain HTML?
8. If minimal direct-model prompts score comparably to current output: should WS-3 of CREATIVE_INTELLIGENCE.md be deprioritized?

---

## Final Recommendation (Preliminary — WS2 required to confirm)

Based on research alone:

**What already exists:**
- v0 API: production-ready, token-based pricing, React component output, 93.87% error-free
- Google Stitch: MCP and SDK released, but API not fully documented, pricing unknown
- Design2Code benchmark: publicly available, provides objective scoring methodology
- Claude Fable 5.2 / GPT-6: consistently top-2 on Design Arena leaderboards across both website and frontend tasks

**What we should test immediately (no extra infrastructure):**
- Minimal direct-model prompts using Claude Fable 5.2 and GPT-6 Astra via OpenRouter
- Claude Fable 5.2 ranks #2 on both Contra Labs and Design Arena; it may already match v0 quality at lower cost and without React output constraints

**What we should NOT build yet:**
- Proprietary visual evaluation pipeline (use Design2Code benchmark methodology instead)
- Custom image generation workflow (test first, build if evidence supports it)
- Full v0 integration (wait until HTML vs React output question is resolved)

**What we should abandon (pending WS2 confirmation):**
- Multiple parallel generation streams per session (5 simultaneous streams is unnecessary cost)
- Five separate style prompts (consolidate to 1–2 based on WS2 results)

**Demonstrated quality improvement:** Cannot state without WS2 comparison. The existing Contra Labs data shows Claude Fable 5.2 is the strongest publicly-available model for design tasks. If IdeaByLunch's current pipeline uses a suboptimal prompt strategy rather than a suboptimal model, switching models alone may not solve quality.

**Actual cost:** Current is ~$0.019/site. Claude Fable 5.2 via OpenRouter would be ~$0.10–0.30/site (5–15× more). v0 Mini is ~$0.016/site but requires React output.

**Remaining risks:**
- v0 React-only output requires significant IdeaByLunch architecture change
- Google Stitch is not evaluatable without direct browser access
- Quality gap between current generation and best-in-class may be prompt strategy, not model selection

---

## Evidence Register

| # | Source | URL | Fetched | Key Finding |
|---|--------|-----|---------|-------------|
| 1 | v0 Composite Model Family | vercel.com/blog/v0-composite-model-family | ✅ | v0-1.5-md uses Claude Sonnet 4 as base; 93.87% error-free; API available |
| 2 | v0 Coding Agent Architecture | vercel.com/blog/how-we-made-v0-an-effective-coding-agent | ✅ | LLM Suspense, AutoFix pipeline; double-digit success rate improvement |
| 3 | v0 Platform API Docs | v0.app/docs/api/platform | ✅ | REST API, v0-sdk, daily quotas; no raw HTML output documented |
| 4 | Google Stitch main page | stitch.google.com | ⚠️ | JS-rendered, no content retrievable |
| 5 | Google Stitch launch blog | blog.google/…/stitch-ai-ui-design/ | ✅ | MCP + SDK "recently released", March 2026; no pricing/GA status |
| 6 | Contra Labs Frontier Design Benchmark | contralabs.com/research/frontier-design-benchmark | ✅ | Claude Fable 5.2 highest-rated public model (Elo 1,714); Gestalt unreleased |
| 7 | Design Arena Website Leaderboard | designarena.ai/leaderboard/website | ✅ | Top: Muse Wonder 1367, Claude Fable 5.2 1351, GPT-6 Astra 1342 |
| 8 | Design Arena Frontend Leaderboard | designarena.ai/leaderboard/code | ✅ | Top: GPT-6.2 Sol 1464, Claude Fable 5.2 1458, GPT-6 Astra 1449 |
| 9 | Design2Code GitHub | github.com/NoviScl/Design2Code | ✅ | Public dataset + 18B model checkpoint; MIT license |
| 10 | DCGen paper | doi.org/10.1145/3729364 | ❌ | 403 from ACM DL; known to use region decomposition |
| 11 | VisRefiner | arxiv.org/abs/2602.05998 | ✅ | 7B model beats GPT-4o on HARD subset; visual-diff self-refinement |
| 12 | LiveWorkspace | arxiv.org/abs/2611.12112 | ✅ | 93.0% edit success via Shared Visual State (vs 41% direct) |
| 13 | v0 Pricing | v0.app/pricing | ✅ | Plus $30/user; token-based; v0 Mini ~$0.016/site at 32K tokens |
| 14 | v0 Stitch MCP Setup | stitch.google.com/docs/mcp/setup/ | ⚠️ | JS-rendered, no content retrievable |

---

*Last updated: 2026-11-27*  
*Next action: Obtain v0 API key; run Candidates A–D comparison (est. $2–4 total); confirm Stitch access in browser*
