# IdeaByLunch — Open Items

## 🔴 Blocking

- **Env var PLATFORM_TOKENS_KEY missing** — social OAuth tokens stored unencrypted until this is set.
  Generate: `openssl rand -hex 32`, add to Vercel env vars (all environments).

- **Env var ADMIN_EMAIL missing** — daily admin digest won't send without it.
  Add `ADMIN_EMAIL=<your email>` to Vercel env vars.

## 🟡 Important

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
