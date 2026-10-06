---
name: replica-entrepreneur
description: Replica step 2. Read public reviews of the original app, rank what users complain about, link every quote, never invent one, and turn the findings into concrete fixes and a reason for people to switch. Use for /replica-entrepreneur, "what do users hate about X", "review mining", "why would anyone switch".
---

# replica-entrepreneur — what users hate, and why they'd switch

**Job:** produce `replica/reviews.md` and `replica/pitch.md`.

Read `.claude/skills/_replica/GUARDRAILS.md` first. Rule 4 (quote, link, never
invent) is the whole point of this skill — a made-up quote makes the output worthless.

## 1. Gather
Use `replica/recon.md` for the app name and category. Search public review
sources: Apple App Store, Google Play, G2, Capterra, Trustpilot, Product Hunt,
Reddit, Hacker News. Read as many as you reasonably can (aim for 200+ if they
exist) and keep a running count of how many you actually read per source.

For each review you keep: source, URL (permalink if possible, otherwise the page
URL), date, star rating if shown, verbatim excerpt (≤ 40 words).

## 2. Classify
Tag each complaint with one theme. Start from these and add as needed:
`bugs/reliability`, `price/billing`, `missing feature`, `UX/confusing`,
`performance`, `support`, `integrations`, `mobile`, `privacy/trust`, `lock-in`.
Also note praise themes — they're the must-keep features.

## 3. Rank
Rank themes by count of complaints, break ties by recency and severity
(1-star > 3-star). Show counts as "X of N reviews read".

## 4. Write `replica/reviews.md`
- Header: sources, total reviews read per source, date range, method.
- Ranked table: rank, theme, count, share %.
- Per theme: 2–5 verbatim quotes, each as `> "quote" — [Source, date](URL)`.
- Praise themes (what to keep).
- Caveats: sampling bias, sources you couldn't read.

If a quote has no URL, delete it. If you only found a few reviews, say so
plainly instead of padding.

## 5. Write `replica/pitch.md`
- For each top-3 complaint: the fix, which screen/flow from `screens.json` it
  touches, and the effort (S/M/L).
- **Reason to switch**: one sentence, plus 3 bullets, each traceable to a
  ranked complaint. No claims you can't back up; no naming the original in
  marketing copy beyond fair, truthful comparison (flag that for `replica-legal`).
- Pricing angle if `price/billing` ranks high.

Tell the user the top complaints in order and suggest `/replica-plan`.
