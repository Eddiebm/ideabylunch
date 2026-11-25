# IdeaByLunch — FIXME

> Durable open-item tracker for this repo. This file is canon: if it's not here, it doesn't exist.
> In-flight steps for the *current* session live in claude-mem `work_state`, not here — this file is the backlog that outlives the session.
> **Last reconciled:** 2026-11-25 (against commit `e6c61a8`)

**Rules of this file (keep it 10/10):**
- Every open item has a **Done when:** — a verifiable condition, not a vibe.
- Keep 🔴 and 🟡 to **≤5 items each**. If a list grows past that, something is really 🟢 or really done.
- Things only the human can do (keys, approvals, buying, running real usage) go in **🔑 Needs you** — never mixed into code work.
- Reconcile at the **start** of any session that touches this repo: fix the date, move shipped items to ✅, delete lies.
- ✅ entries lead with **date · version** so Done doubles as a changelog.

---

## 🔴 Blocking — broken or can't ship (cap 5)
- [ ] **Generation and checkout are switched off** — the Worker has no `OPENROUTER_API_KEY`, and `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` are deliberately held back so nobody can pay for something that cannot be built. `/api/generate` and `/api/checkout` return 503. **Done when:** the OpenRouter key is set, both Stripe secrets are loaded, and a test brief generates and reaches Stripe checkout on ideabylunch.com.
- [ ] **Site publishing still targets Vercel** — `deployToVercel()` posts customer sites to the Vercel API with `VERCEL_DEPLOY_TOKEN`, so paid orders cannot publish while that account is paused. _Files:_ `app/lib/deploy.ts`, `app/api/webhook/route.ts`, `app/api/free-build/route.ts`, `app/api/paystack/webhook/route.ts`, `app/api/dashboard/**/update/route.ts`. **Done when:** a test order produces a reachable preview URL without calling `api.vercel.com`.

## 🟡 Important — do soon (cap 5)
- [ ] **Deploy gate does not fit Cloudflare** — `npm run deploy` runs `check-env.ts` against local `process.env`, but production secrets now live only in the Worker, so the gate fails on any machine. The 2026-11-25 deploy ran `next build` and `opennextjs-cloudflare build --skipNextBuild` by hand. _Files:_ `scripts/check-env.ts`, `package.json`. **Done when:** `npm run deploy` passes by checking required names against `wrangler secret list`, and still fails when one is missing.
- [ ] **Cron Triggers unverified end to end** — the `scheduled` handler is wired and rejects unknown schedules, but no real schedule has been fired because each one sends live email. _Files:_ `worker.ts`, `wrangler.jsonc`. **Done when:** the 07:00 UTC admin digest arrives after deploy and `wrangler tail` shows no `scheduled` exception.
- [ ] **Disable the Vercel copy after cutover** — the Vercel project is still linked to this repo; when the pause lifts it would serve a second copy. Crons are already removed from `vercel.json`. **Done when:** the Vercel project is disconnected from Git or deleted (needs Eddie's OK).
- [ ] **Separate dev/preview/prod resources** — Upstash Redis, Stripe and Paystack share one set of keys across every environment. **Done when:** preview builds use a separate Upstash database and Stripe test keys, and production keys appear only in production secrets.
- [ ] **Monitoring, alerts, backups** — no uptime check on `/api/health`, no scheduled Upstash export, no 5xx alert. **Done when:** an uptime monitor pings `/api/health` every 5 minutes, a daily Upstash export is scheduled, and one key has been restored from a backup as a test.

## 🔑 Needs you — only the human can do these (keys, approvals, errands, real usage)
- [ ] **Create one OpenRouter key for this app** — openrouter.ai → Keys → Create, copy it, then run `pbpaste | npx wrangler secret put OPENROUTER_API_KEY` in this folder so it never touches chat. **Unblocks:** all AI generation; Claude then loads the held-back Stripe secrets to reopen checkout.
- [ ] **Optional keys** — `OPENAI_API_KEY` (logo generation only) and `UNSPLASH_ACCESS_KEY` (stock photos in generated sites), set the same way. The three `STRIPE_*_PRICE_ID` values are not needed: checkout falls back to inline prices. **Unblocks:** `/logo`, photo-backed sites.
- [ ] **Move `idea2lunch.com` nameservers to Cloudflare** at its registrar (currently `ns1.vercel-dns.com`). **Unblocks:** the alias domain.

## 🟢 Someday — real but not now; the menu to pull work from
- [ ] **`/api/geo` does not exist** — `BriefGenerator.tsx` fetches it to pick the market, gets a 404, and silently falls back to US pricing in the builder. Do not add the route until Paystack keys are set, or non-US visitors are sent to a checkout that cannot work. _Files:_ `app/app/BriefGenerator.tsx`. **Done when:** the builder shows local pricing for a GH visitor and that checkout completes in test mode.
- [ ] **`www` serves a duplicate of the apex** — both are custom domains on the Worker; canonical tags point to the apex. **Done when:** `https://www.ideabylunch.com/` returns a 301 to `https://ideabylunch.com/`.
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
- **2026-11-25 · `0.1.0`** — Live on Cloudflare Workers: Worker `ideabylunch` deployed with custom domains `ideabylunch.com` and `www.ideabylunch.com`, 13 secrets copied from Vercel, four Cron Triggers registered. Verified: 15 routes on ideabylunch.com return expected statuses with `server: cloudflare` and no Vercel headers; the home page counter reads live from Redis. Rollback: restore DNS-only `A 76.76.21.21` for apex and `www` (the Vercel records removed at cutover). Deploys use the wrangler auth profile `bannerman`, bound to this folder.
- **2026-11-25 · `0.1.0`** — Cloudflare Workers build via OpenNext on branch `migrate/cloudflare-workers`: removed `runtime = 'edge'` from 79 files (16 pages now prerender), added `wrangler.jsonc`, `open-next.config.ts` (R2 cache + DO queue) and `worker.ts` (Cron Triggers), read country from `cf-ipcountry`, replaced the Node-only fetch helper; verified with `next build`, `opennextjs-cloudflare build`, and 20 routes returning expected statuses in the local Workers runtime, including country-specific pricing.
- **2026-11-25 · `0.1.0`** — Reconciled: `PLATFORM_TOKENS_KEY` and `ADMIN_EMAIL` were listed as missing but are both set in production; verified by reading the Vercel production env list.
