---
name: replica-deploy
description: Replica step 11. Ship the rebuild — but only after the brand gate passes. Runs brand-guard.mjs, which blocks deploy while the original app's names, trademarks, taglines or brand colors appear anywhere in the project, then deploys and verifies. Use for /replica-deploy, "ship it", "deploy the rebuild", "go live".
---

# replica-deploy — brand gate, then ship

**Job:** deploy the rebuild and verify it's live. **Stop** if the brand gate
fails.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/plan.md`,
`replica/test-report.md`, `replica/legal-checklist.md`.

## 1. Brand gate (mandatory, no overrides)
```bash
node .claude/skills/replica-deploy/scripts/brand-guard.mjs
```
It reads `replica/brand-blocklist.json` and scans every text file (skipping
`node_modules`, `.git`, build output, and `replica/`) for:
- any name or term, case-insensitive, including in URLs, metadata and alt text;
- any hex/rgb color within `colorTolerance` of a blocklisted color.

If it exits non-zero: **do not deploy.** Show the findings, fix each one
(rename, re-word, swap to design tokens from `replica/design.md`), and rerun
until it passes. Do not edit the blocklist to make it pass, and do not add
paths to `ignorePaths` to hide matches. If the user insists, explain the
gate exists to keep them out of trademark trouble and refuse to bypass it.

## 2. Pre-flight
- `replica/test-report.md` has no open blockers. If it's missing, run `/replica-test` first.
- `replica/legal-checklist.md` exists. If payments are live-mode, its
  trademark and lawyer items should be checked off — if not, warn the user
  clearly and ask them to confirm before continuing.
- Production build passes locally. Env vars listed in `.env.example` are set
  in the host (ask the user to confirm; never paste secrets in chat).

## 3. Deploy
Use the host in `plan.md`. Prefer a preview deploy first, then promote to
production after the user confirms. Run DB migrations. Register production
webhook URLs (payments, auth) with providers.

## 4. Verify
Load the live URL, run the e2e smoke test against it, complete the paid flow in
test mode, check HTTPS and the custom domain. Run the brand guard once more.

Tick deploy in `replica/progress.md`, and tell the user the URL and what to
monitor.
