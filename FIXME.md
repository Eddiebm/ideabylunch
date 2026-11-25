# IdeaByLunch — FIXME

> Durable open-item tracker for this repo. This file is canon: if it's not here, it doesn't exist.
> In-flight steps for the *current* session live in claude-mem `work_state`, not here — this file is the backlog that outlives the session.
> **Last reconciled:** 2026-11-25 (against commit `49ccb98`)

**Rules of this file (keep it 10/10):**
- Every open item has a **Done when:** — a verifiable condition, not a vibe.
- Keep 🔴 and 🟡 to **≤5 items each**. If a list grows past that, something is really 🟢 or really done.
- Things only the human can do (keys, approvals, buying, running real usage) go in **🔑 Needs you** — never mixed into code work.
- Reconcile at the **start** of any session that touches this repo: fix the date, move shipped items to ✅, delete lies.
- ✅ entries lead with **date · version** so Done doubles as a changelog.

---

## 🔴 Blocking — broken or can't ship (cap 5)
- [ ] **Production is down** — the Vercel account is paused (Hobby CPU limit, since 2026-11-07; auto-lifts 2026-12-07). The Cloudflare build on `migrate/cloudflare-workers` runs locally but is not deployed. _Files:_ `wrangler.jsonc`, `worker.ts`. **Done when:** `curl -sI https://ideabylunch.com` returns 200 with `server: cloudflare` and no `x-vercel-*` headers.
- [ ] **Site publishing still targets Vercel** — `deployToVercel()` posts customer sites to the Vercel API with `VERCEL_DEPLOY_TOKEN`, so paid orders cannot publish while that account is paused. _Files:_ `app/lib/deploy.ts`, `app/api/webhook/route.ts`, `app/api/free-build/route.ts`, `app/api/paystack/webhook/route.ts`, `app/api/dashboard/**/update/route.ts`. **Done when:** a test order produces a reachable preview URL without calling `api.vercel.com`.

## 🟡 Important — do soon (cap 5)
- [ ] **Cron Triggers unverified end to end** — the `scheduled` handler is wired and rejects unknown schedules, but no real schedule has been fired because each one sends live email. _Files:_ `worker.ts`, `wrangler.jsonc`. **Done when:** the 07:00 UTC admin digest arrives after deploy and `wrangler tail` shows no `scheduled` exception.
- [ ] **Disable the Vercel copy after cutover** — the Vercel project is still linked to this repo; when the pause lifts it would serve a second copy. Crons are already removed from `vercel.json`. **Done when:** the Vercel project is disconnected from Git or deleted (needs Eddie's OK).
- [ ] **`/api/geo` does not exist** — `BriefGenerator.tsx` fetches it to pick the market, gets a 404, and silently falls back to US pricing in the builder. Do not add the route until Paystack keys are set, or non-US visitors are sent to a checkout that cannot work. _Files:_ `app/app/BriefGenerator.tsx`. **Done when:** the builder shows local pricing for a GH visitor and that checkout completes in test mode.
- [ ] **Separate dev/preview/prod resources** — Upstash Redis, Stripe and Paystack share one set of keys across every environment. **Done when:** preview builds use a separate Upstash database and Stripe test keys, and production keys appear only in production secrets.
- [ ] **Monitoring, alerts, backups** — no uptime check on `/api/health`, no scheduled Upstash export, no 5xx alert. **Done when:** an uptime monitor pings `/api/health` every 5 minutes, a daily Upstash export is scheduled, and one key has been restored from a backup as a test.

## 🔑 Needs you — only the human can do these (keys, approvals, errands, real usage)
- [ ] **Sign wrangler in to the Cloudflare account that owns `ideabylunch.com`** — run `wrangler login` and choose the `bannermanmenson.com` login. **Unblocks:** deploy and the custom domain.
- [ ] **Re-supply six values Vercel will not reveal** (stored as "sensitive", unreadable by anyone): `OPENROUTER_API_KEY` (openrouter.ai → Keys), `OPENAI_API_KEY` (platform.openai.com → API keys), `UNSPLASH_ACCESS_KEY` (unsplash.com/oauth/applications), and `STRIPE_LAUNCH_PRICE_ID`, `STRIPE_DESIGN_PRICE_ID`, `STRIPE_FULL_PRICE_ID` (Stripe dashboard → Product catalogue → each price → copy ID). Set each with `wrangler secret put <NAME>`. **Unblocks:** AI generation, logo generation, stock imagery, checkout.
- [ ] **Move `idea2lunch.com` nameservers to Cloudflare** at its registrar (currently `ns1.vercel-dns.com`). **Unblocks:** the alias domain.

## 🟢 Someday — real but not now; the menu to pull work from
- [ ] **Several stored secrets end in a stray newline** (`VERCEL_DEPLOY_TOKEN`, `HUNTER_API_KEY`, `SERPAPI_KEY`, `PLATFORM_TOKENS_KEY`, `FREE_BUILD_TOKEN`, `ADMIN_EMAIL`). Copied as-is to keep behaviour identical. **Done when:** each is re-set without trailing whitespace and its feature still works.
- [ ] **Home page fetches its own `/api/stats` over HTTP on every view** — read Redis directly instead. _Files:_ `app/page.tsx`. **Done when:** rendering `/` makes no request to its own origin.
- [ ] **Server-side Sentry never initialises** — there is no `instrumentation.ts`, so `sentry.server.config.ts` and `sentry.edge.config.ts` are never loaded. **Done when:** a thrown error in an API route appears in Sentry.
- [ ] **Vercel Analytics removed, events not replaced** — `<Analytics />` is gone (its script only exists on Vercel); the `track()` calls in `BriefGenerator.tsx` are now no-ops. **Done when:** checkout and brief events land in a replacement analytics tool, or the calls are deleted.
- [ ] **Seller recruitment drip** — `app/api/hunt/` can scrape and send outreach but nothing triggers a campaign. **Done when:** a scheduled job emails `hunt:outreach:queue` members on a three-email, seven-day sequence via Resend.
- [ ] **Lint in CI** — no `npm run lint` script or ESLint config in the repo. **Done when:** `npm run lint` passes and runs on every PR.
- [ ] **Webhook idempotency tests** — **Done when:** a test replays a Stripe and a Paystack webhook and asserts one order results.
- [ ] **Dashboard token revocation UI** — admin-API-only today. **Done when:** an admin can revoke a token from `/admin`.
- [ ] **Seller pause/resume UI** — endpoint exists at `/api/admin/seller`. **Done when:** `/admin` has a working pause/resume control.
- [ ] **Funnel daily breakdown chart** — data is in `/api/admin/stats`. **Done when:** `/admin` renders the daily funnel chart.

## ✅ Done — newest first (date · version · what shipped + how verified)
- **2026-11-25 · `0.1.0`** — Cloudflare Workers build via OpenNext on branch `migrate/cloudflare-workers`: removed `runtime = 'edge'` from 79 files (16 pages now prerender), added `wrangler.jsonc`, `open-next.config.ts` (R2 cache + DO queue) and `worker.ts` (Cron Triggers), read country from `cf-ipcountry`, replaced the Node-only fetch helper; verified with `next build`, `opennextjs-cloudflare build`, and 20 routes returning expected statuses in the local Workers runtime, including country-specific pricing.
- **2026-11-25 · `0.1.0`** — Reconciled: `PLATFORM_TOKENS_KEY` and `ADMIN_EMAIL` were listed as missing but are both set in production; verified by reading the Vercel production env list.
