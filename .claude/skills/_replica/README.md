# Replica — rebuild an app's job as your own product

11 Claude Code skills, one job each. They rebuild **what an app does** — never its
code, logo, name, words or colors. Rules every skill follows: `GUARDRAILS.md`.

| # | Command | Job | Writes |
|---|---|---|---|
| 1 | `/replica-recon <url>` | Map screens, flows, data from public pages + your own account; estimate | `replica/recon.md`, `screens.json`, `brand-blocklist.json` |
| 2 | `/replica-entrepreneur` | Rank what users hate from public reviews — every quote linked, none invented | `replica/reviews.md`, `pitch.md` |
| 3 | `/replica-plan` | Pick ONE slice (the flow people pay for), stack, milestones | `replica/plan.md`, `progress.md` |
| 4 | `/replica-design` | New name, palette, type, logo — provably distinct | `replica/design.md` |
| 5 | `/replica-scaffold` | Runnable skeleton | project files |
| 6 | `/replica-build` | Rebuild screen by screen | project files |
| 7 | `/replica-auth` | Logins and protected routes | project files |
| 8 | `/replica-payments` | Checkout, verified webhooks, entitlements | project files |
| 9 | `/replica-test` | Bug hunt + fixes | `replica/test-report.md` |
| 10 | `/replica-legal` | Trademark checks, terms of everything used, when to call a lawyer | `replica/legal-checklist.md` |
| 11 | `/replica-deploy` | Brand gate (`scripts/brand-guard.mjs`), then ship | — |

## Install into another project
Copy `.claude/skills/_replica` and `.claude/skills/replica-*` into that project's
`.claude/skills/` (or `~/.claude/skills/` for all projects), then restart Claude Code.

## Brand gate
```bash
node .claude/skills/replica-deploy/scripts/brand-guard.mjs [projectRoot] [--json]
```
Exit 0 = clean, 1 = blocklisted name/term/color found, 2 = no blocklist (run recon).

Replica's legal step is a checklist, not legal advice.
