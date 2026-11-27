# IdeaByLunch — Open Items

Last reconciled: 2026-11-27 (commit eb96a83)

## 🔑 Needs you

- **Add `DATABASE_URL` to Vercel** — C-004 delivery integrity requires Neon Postgres at runtime.
  `vercel env add` is blocked by team fair-use limits; must be done in the dashboard.
  Steps: Vercel dashboard → ideabylunch project → Settings → Environment Variables →
  Add `DATABASE_URL` for Production, Preview, and Development.
  Connection string: fetch via `neon get_connection_string` for project `curly-mode-30910410`.
  **Done when:** `vercel env ls` shows `DATABASE_URL` present for all 3 environments.

## 🔴 Blocking

- **Env var PLATFORM_TOKENS_KEY missing** — social OAuth tokens stored unencrypted until this is set.
  Generate: `openssl rand -hex 32`, add to Vercel env vars (all environments).

- **Env var ADMIN_EMAIL missing** — daily admin digest won't send without it.
  Add `ADMIN_EMAIL=<your email>` to Vercel env vars.

## 🟡 Important

- **PROJECT GALILEO — Workstream 2 (controlled comparison) pending budget authorization** —
  Research complete (WS1 done, see `PROJECT_GALILEO.md`). Key finding: v0 outputs React components
  not HTML — requires architecture change to integrate. Claude Fable 5.2 ranks highest on public
  benchmarks. Next step: run A-D model comparison (~$2–4 via OpenRouter) to confirm quality gap
  is prompt strategy vs model selection, before any infrastructure investment.
  **Done when:** comparison results written to PROJECT_GALILEO.md WS2 section with explicit
  recommendation for or against v0/image-generation investment.

- **C-004 acceptance tests** — Write tests for: concurrent webhook processing, payment
  verification, ownership checks, immutable versions, durable asset availability,
  deployment failure + recovery, checkout version binding.
  **Done when:** test suite covers all 8 scenarios and passes on CI.

- **Item 11 — Separate dev/preview/prod resources**: Upstash Redis, Stripe, and Paystack accounts
  should have separate keys per environment. Currently all environments share the same keys.
  Action: create `ideabylunch-preview` Upstash database; use Stripe test mode for preview deploys;
  set env vars in Vercel dashboard per-environment (not globally).

- **Item 13 — Monitoring, alerts, backups**:
  - Set up Upstash Redis export/backup (Upstash console → Data Export → schedule daily)
  - Add Vercel alert for 5xx spike (Vercel dashboard → Monitoring → Alerts)
  - Test restoration: `redis-cli RESTORE` a key from backup quarterly
  - Wire UptimeRobot or Better Uptime to hit `/api/health` every 5 min (endpoint now live)

- **Seller recruitment outreach** — `app/api/hunt/` has scrape/outreach sub-routes but no
  automated campaign trigger. Next step: add a cron that emails `hunt:outreach:queue` members
  via Resend on a drip schedule (3 emails over 7 days: intro, proof, CTA).

## 🟢 Nice to Have

- Add `npm run lint` script (eslint) and wire into CI
- Add integration tests for webhook idempotency (Stripe + Paystack retry simulation)
- Dashboard token revocation UI (currently admin-API-only)
- Seller pause/resume UI in admin dashboard (endpoint live at `/api/admin/seller`)
- Funnel daily breakdown chart in admin dashboard (data available via `/api/admin/stats → funnel`)
