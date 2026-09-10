# IdeaByLunch — Open Items

## 🔴 Blocking

- **Env var PLATFORM_TOKENS_KEY missing** — social OAuth tokens stored unencrypted until this is set.
  Generate: `openssl rand -hex 32`, add to Vercel env vars (all environments).

## 🟡 Important

- **Item 11 — Separate dev/preview/prod resources**: Upstash Redis, Stripe, and Paystack accounts
  should have separate keys per environment. Currently all environments share the same keys.
  Action: create `ideabylunch-preview` Upstash database; use Stripe test mode for preview deploys;
  set env vars in Vercel dashboard per-environment (not globally).

- **Item 13 — Monitoring, alerts, backups**:
  - Set up Upstash Redis export/backup (Upstash console → Data Export → schedule daily)
  - Add Vercel alert for 5xx spike (Vercel dashboard → Monitoring → Alerts)
  - Test restoration: `redis-cli RESTORE` a key from backup quarterly
  - Add `/api/health` endpoint returning `{ ok: true, ts: Date.now() }` for uptime monitoring
  - Wire UptimeRobot or Better Uptime to hit `/api/health` every 5 min

- **video/status/route.ts type errors** (pre-existing, not security-related):
  - TS2367: FAILED not in status union — update the status type to include `'FAILED'`
  - TS2344: EndpointType constraint mismatch — fix the type parameter

## 🟢 Nice to Have

- Add `npm run lint` script (eslint) and wire into CI
- Add integration tests for webhook idempotency (Stripe + Paystack retry simulation)
- Dashboard token revocation UI (currently admin-API-only)
