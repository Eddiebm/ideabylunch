---
name: replica-recon
description: Replica step 1. Map an existing app from its public pages (and screens the user shows from their own account) into an inventory of screens, user flows and the data behind them, then estimate the rebuild. Use when the user runs /replica-recon <url>, says "reverse engineer", "map this app", "what would it take to rebuild X", or starts a Replica project.
---

# replica-recon — map the app

**Job:** turn a URL into `replica/recon.md`, `replica/screens.json` and
`replica/brand-blocklist.json`. Nothing else — no planning, no code.

Read `.claude/skills/_replica/GUARDRAILS.md` first and follow it throughout.

## 1. Ask before you fetch
Ask the user (one message, short):
1. The app's URL (if not given as an argument).
2. Public pages only, or will they also share screenshots/notes from **their own** account?
3. What do they actually use it for? Which flow would they pay for?
4. Who is it for — just them, their team, or a product to sell?

## 2. Collect (public, polite, few requests)
- Check `robots.txt`; skip disallowed paths.
- Fetch: home, pricing, features, docs/help index, changelog, integrations,
  signup page, any public demo/booking/share pages. Aim for 10–25 pages total.
- If the user shares screenshots of their account, catalog each one as a screen.
- Do **not** read JS bundles, intercept private API calls, or log in.

## 3. Build the inventory
For each **screen**: id, neutral name (your words, not theirs), who sees it
(visitor / user / admin / invitee), purpose, key UI elements, data shown,
data edited, source URL or "user screenshot N".

For each **flow**: id, neutral name, actor, trigger, ordered screen ids, the
outcome, and whether money changes hands. Mark the flow(s) users pay for.

**Data model:** infer entities, key fields and relations from what the screens
show (e.g. `User`, `EventType`, `Booking`, `Availability`). Note integrations
(calendar, email, payments, webhooks).

## 4. Estimate
Give two numbers with reasoning, sized for one developer using Claude Code:
- **Full rebuild** (all screens/flows): in weeks or months.
- **First slice** (the one paid flow end-to-end, minimum screens): in days.
Use rough points: simple screen 0.5d, form/CRUD 1d, complex interactive 2–3d,
each integration 1–3d, auth 1d, payments 1–2d, then +30% for testing/polish.

## 5. Brand blocklist
Write `replica/brand-blocklist.json`:
```json
{
  "original": "https://example.com",
  "names": ["ProductName", "Product Name", "productname.com"],
  "terms": ["trademarked feature names", "taglines"],
  "colors": ["#0069ff", "#1a1a1a"],
  "colorTolerance": 24,
  "ignorePaths": ["replica/"]
}
```
Get colors from the public site's visible brand (logo, primary buttons, headers).
Include common misspellings and the domain. This file is the deploy gate's input.

## 6. Output
- `replica/screens.json`: `{ "screens": [...], "flows": [...], "entities": [...], "integrations": [...] }`
- `replica/recon.md`: summary line ("N screens, M flows"), the paid flow(s),
  screen table, flow list, data model, integrations, estimate, open questions,
  and a sources list with every URL fetched.

Finish by telling the user the counts, the estimate, and the next steps:
`/replica-entrepreneur` (what users hate) then `/replica-plan` (pick a slice).
