# Audit auto-fix v1 — one-click apply for existing IdeaByLunch customers

> **Status:** scoped, not yet implemented. Single-session scope.

---

## Why

The audit feature today identifies problems and (for paid users) outputs ready-to-paste TSX patches. Customers still have to:
- Open the patches page
- Copy each block into their editor
- Paste, save, push, deploy
- Hope they pasted into the right place

Most customers won't do this — even after paying. The friction kills adoption of the very fix they bought.

Meanwhile, **for sites IBL itself built and deployed**, we already control the Vercel project and the source files. There's no reason a customer should manually paste anything. One-click "Apply this rewrite" should:
1. Pull the customer's source code from their IBL-managed Vercel project
2. Apply the patches programmatically (hero, FAQ, JSON-LD, pricing-tier display)
3. Redeploy to a preview URL
4. Show the customer the before/after side-by-side
5. On their explicit "Ship to production" click, promote the preview to prod

This turns the audit from *"a list of suggestions"* into *"a button that updates your live site in 30 seconds."* That's the magic moment. That's also what makes the **Operator tier ($97/mo) genuinely worth paying for** — weekly auto-audit + one-click apply becomes the retention hook.

---

## Goal

Customers who built their site through IBL should be able to:
1. Land on `/audit/[their-domain]`
2. See a contextual "Apply this rewrite to your live site" button (replacing the generic $49 patches upsell when the audited domain matches their account)
3. Click it → land on a preview URL within 60 seconds with the rewrite already shipped to a Vercel preview deploy
4. Review the diff visually
5. One more click → promote to production

No paste. No editor. No git push. Done.

---

## Scope

### Phase 1 — Customer detection

**Question:** is the audited site an IBL-built site that we have control over?

- The build/deploy flow in `app/lib/deploy.ts` already creates a record per customer site. Find that record's keying scheme (likely `site:{siteId}` or `customer:{email}:sites` in Redis).
- Add a reverse-lookup index: `domain:{domain}` → `siteId` so the audit pipeline can answer "do I own this site?" in O(1).
- When the audit results page loads, check `domain:{audited-domain}`:
  - **Hit:** customer-owned site. Surface the "Apply this rewrite" button.
  - **Miss:** stranger's site. Fall through to the existing score+stack-aware upsell.

**Files touched:** `app/lib/deploy.ts` (write to the new index on deploy), `app/audit/[slug]/page.tsx` (read on render). ~30 lines.

### Phase 2 — Apply endpoint

**`POST /api/audit/apply`** with body `{ slug, siteId }` (slug = audit slug, siteId = customer's site id):

1. Authenticate the request — only the site owner can apply (use their `i2l_session` cookie → email lookup).
2. Load the cached audit (`audit:{slug}`) — error if missing.
3. Load the customer's site record (`site:{siteId}`) — error if not owned by this email.
4. Generate the patched files in-memory:
   - `app/page.tsx`: replace the `<h1>` block with `audit.rewrite.h1`/`sub`/CTAs
   - Inject the FAQ section + FAQPage JSON-LD using `audit.faqs`
   - If `audit.tierRename.length > 0`: update tier display labels (the file structure has to be predictable — only works for sites IBL deployed from a known template)
5. Push the patched source to the customer's Vercel project via the Vercel API:
   - Either use the Vercel "files" API to update files in the project, or
   - Push to a Vercel-linked GitHub repo if one exists (preferred — preserves history)
6. Trigger a **preview deploy** (NOT production). Get the preview URL.
7. Store `apply:{siteId}:{slug}` in Redis with `{ previewUrl, previewDeploymentId, beforeFiles, status: 'preview' }`. TTL 7 days.
8. Return `{ previewUrl, applyId }` to the client.

**Files touched:** new `app/api/audit/apply/route.ts`, helpers in `app/lib/deploy.ts`. ~150 lines.

### Phase 3 — Diff preview + promote-to-prod

`/audit/[slug]/applied/[applyId]/page.tsx` — server-rendered page that:

1. Loads the apply record from Redis.
2. Renders an iframe of the preview URL on the right.
3. Renders the before-text on the left (use the `current.h1`, `current.title`, `current.description` from the audit) for visual diff.
4. Two buttons: **"Ship to production"** (calls `POST /api/audit/promote`) or **"Roll back"** (deletes the preview deployment).

**`POST /api/audit/promote`**:
- Verify the apply record exists and belongs to the calling email.
- Promote the Vercel preview deployment to production via Vercel API.
- Update Redis: `apply:{siteId}:{slug}.status = 'shipped'`.
- Return `{ productionUrl }`.

**Files touched:** new `app/audit/[slug]/applied/[applyId]/page.tsx`, new `app/api/audit/promote/route.ts`. ~120 lines.

### Phase 4 — Rate limit + safety

- **Auth:** every endpoint MUST verify the `i2l_session` cookie matches the site owner's email. No session, no apply.
- **Rate limit:** 3 applies per site per day (prevents accidents and abuse). Stored in Redis as `apply:rate:{siteId}`, TTL 1 day.
- **Always preview first:** the apply route must NEVER push directly to production. Only `/api/audit/promote` can promote, and only after the customer explicitly clicks the button.
- **Logging:** every apply writes to `audit:applies` (sorted set, scored by timestamp) so we can audit the audit-applier.

**Files touched:** all of the above. ~30 lines added across them.

---

## Acceptance criteria

After this ships:
- [ ] Customer audits their own IBL-built site → sees "Apply this rewrite to your live site" instead of "$49 patches"
- [ ] Clicking it produces a Vercel preview URL within 60 seconds
- [ ] Preview URL renders the audited site with the rewritten hero, FAQ, JSON-LD applied
- [ ] Customer sees a side-by-side before/after with one button to promote
- [ ] Promote button moves the preview to production within 30 seconds
- [ ] Rollback button deletes the preview without affecting prod
- [ ] All endpoints reject unauthenticated requests and other-customer-owned-site requests
- [ ] Rate limit prevents >3 applies per site per day

---

## Out of scope (deliberately)

- **Non-IBL sites** — that's Level 3 (GitHub OAuth + PR generation). Separate session, much bigger.
- **Custom-branded sites** that drift from IBL's template structure — only works for sites deployed from the known template. Track template-version on the site record so we know which sites are eligible.
- **Multi-page rewrites** — only the homepage is in scope. Per-page rewrites belong to a v2.
- **Image/visual rewrites** — text-only patches.
- **Tier rename in Stripe** — display-label rename only; Stripe products stay as-is. Stripe rename is a separate operation that runs through `scripts/stripe-catalog.js`.
- **Auto-apply without customer consent** — never. Even on Operator tier, the customer must click "Apply" each time. Auto-running this without consent breaks trust catastrophically the first time it gets a rewrite wrong.

---

## Pricing implication

- **Operator tier ($97/mo) gets weekly auto-audit + one-click apply** as the retention hook. This is the headline feature that makes Operator stop feeling like "just hosting."
- **Launch / Growth / Scale customers get one free apply** as part of their build (within 30 days of launch).
- **Beyond that, $19/apply for non-Operator customers** (cheaper than the $49 patches, because we're doing the work for them — opposite of intuition, but the value-per-effort ratio is much higher for us so we can afford to undercut).

This pricing structure also makes Operator drift-resistant: customers who churn off Operator lose access to the auto-apply, which is a real feature loss, not just "we stopped hosting your site."

---

## Token budget estimate

- Reading existing files: `app/lib/deploy.ts` (medium), `app/audit/[slug]/page.tsx` (medium — already in context across sessions), Vercel API docs reference
- Writing: 3 new files (apply route, promote route, applied page) + 2 edits (deploy.ts, audit page)
- Verification: tsc + a real applied flow on a test customer site
- **Likely fits in one full session.** Don't pair with other work — this needs focused attention because it touches deployed customer sites.

---

## Sequencing recommendation

1. **First:** ship `VIDEO_V2_SCOPE.md` paired with the freemium video gate (one session — both touch the video pipeline)
2. **Second:** ship this (`AUDIT_AUTOFIX_SCOPE.md`) — it depends on the customer-site index being clean, which means the Video v2 work shouldn't have changed deploy.ts in conflicting ways
3. **Third:** Level 3 GitHub OAuth + PR generation for non-customers (its own session, biggest swing)

---

## When to do this

- Earliest: after distribution Week 2 (when there are real Operator customers in the database to dogfood the apply flow against)
- Latest: before Operator hits 20 paying customers (after that, churn from "Operator doesn't do enough" starts mattering)

Reference for the next Claude: this file is the source of truth. Read it, then execute Phase 1 → 4 in order, ship one commit per phase. Verify on a known-good IBL-deployed test site before exposing to real customers.
