---
name: replica-legal
description: Replica step 10. Before selling the rebuild, produce a checklist of trademark searches for the new name, the terms of every tool/API/dataset used, policies the product needs, and when to talk to a lawyer. Not legal advice. Use for /replica-legal, "can I sell this", "trademark check", "is this legal".
---

# replica-legal — checks before you sell

**Job:** `replica/legal-checklist.md`. This is a checklist, **not legal
advice** — say so at the top of the file and in your reply.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/design.md`,
`replica/plan.md`, `replica/pitch.md`, `replica/brand-blocklist.json`.

## 1. Trademark checks for the new name
List the searches for the user to run, with direct links, in the countries they
plan to sell:
- USPTO trademark search (US), EUIPO eSearch (EU), UK IPO, WIPO Global Brand
  Database, plus the user's own country's office.
- Search the exact name, phonetic variants, and the class for software/SaaS
  (Nice classes 9 and 42).
- App Store / Google Play / domain / social handle search.
Record results in a table the user fills in. If anything close shows up in the
same class, recommend picking another name.

## 2. Terms of everything used
Inventory every dependency and service from the codebase and `plan.md`
(hosting, auth, payments, AI APIs, fonts, icon sets, datasets, npm packages).
For each: license or terms URL, commercial use allowed?, attribution needed?,
restrictions. Run a license scan of dependencies and flag copyleft/unknown
licenses. Also re-confirm the original's terms of service and what recon
fetched — flag anything that relied on content those terms restrict.

## 3. Clean-room confirmation
Confirm, with evidence:
- `brand-guard.mjs` passes.
- No copied code, copy, images, or fonts (spot-check a sample of files).
- Marketing copy in `pitch.md` makes only truthful, supportable comparisons and
  doesn't imply affiliation with the original.

## 4. Policies the product needs
Terms of service, privacy policy, cookie notice, refund policy, DPA if B2B,
and what data you store. Note where payments create tax obligations (sales
tax/VAT) — the user should check with an accountant.

## 5. When to talk to a lawyer
Say clearly: **talk to a lawyer if real money is involved**, before taking
payments from strangers, if any trademark search came back close, if
comparative advertising names the original, or if the original's terms
restricted anything recon used.

Tick legal in `replica/progress.md`. Next: `/replica-deploy`.
