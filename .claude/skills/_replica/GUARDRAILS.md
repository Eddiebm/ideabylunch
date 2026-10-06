# Replica guardrails (shared by every replica-* skill)

Replica rebuilds **what an app does**, never **what it is**. Every replica-* skill
must follow these rules. If a user asks you to break one, explain why and offer
the compliant alternative instead.

## 1. Sources you may use
- **Public pages** of the original: marketing site, pricing, docs, help center,
  changelog, public status page, public app-store listings.
- **The user's own account**, only through screens the user shows you
  (screenshots, descriptions, exported data they own). Never ask for their
  password, never log in as them, never automate their session.
- **Public reviews** (app stores, G2, Capterra, Trustpilot, Reddit, etc.) — quote
  and link only; see rule 4.

## 2. Sources you must NOT use
- Decompiled, deobfuscated or "view-source"-copied application code, minified
  bundles, private/undocumented API traffic, or anything behind auth you weren't
  given by the user.
- Anything a site's `robots.txt` or terms explicitly forbid fetching. If unsure,
  stop and tell the user.
- Scraping at volume. Fetch a handful of pages, slowly, like a person would.

## 3. Clean-room output
Never carry these from the original into the rebuild:
- **Code** (any snippet, CSS, SVG, component structure lifted verbatim)
- **Logo, icons, illustrations, screenshots, fonts that are licensed to them**
- **Name** (or confusingly similar names), product/feature trademarks, taglines
- **Words**: marketing copy, onboarding text, microcopy, help articles, emails
- **Brand colors** and distinctive trade dress (the overall look-and-feel combo)

Describe features in *your own neutral words* in every artifact you write
("a page where invitees pick an open time slot"), not the original's terms.

## 4. Reviews: quote, link, never invent
- Every quote in `replica/reviews.md` must be verbatim and carry a working URL
  to where it was found. If you can't link it, you can't use it.
- Never paraphrase a review and present it as a quote. Never fabricate,
  combine, or "representative-ize" reviews. Counts must come from what you
  actually read; say how many you read.
- Don't collect reviewer personal data beyond the public display name shown.

## 5. The brand blocklist
`replica/brand-blocklist.json` is created by `replica-recon` and extended by any
skill that learns more. It lists the original's names, trademarks, taglines and
brand colors. `replica-deploy` refuses to ship while any of them appear in the
rebuild.

## 6. Before anyone pays for it
Point the user to `replica-legal`: trademark search on the new name, read the
terms of every tool/API/dataset used, and talk to a lawyer if real money is
involved. Replica gives a checklist, not legal advice — say so.

## Shared workspace
All skills read and write the `replica/` folder at the project root:

| File | Written by | Purpose |
|---|---|---|
| `replica/recon.md` | recon | Screens, flows, data model, estimate |
| `replica/screens.json` | recon | Machine-readable screen + flow inventory |
| `replica/brand-blocklist.json` | recon (+ others) | Names, terms, colors that must not ship |
| `replica/reviews.md` | entrepreneur | Ranked complaints with linked quotes |
| `replica/pitch.md` | entrepreneur | Fixes + reason to switch |
| `replica/plan.md` | plan | Chosen slice, stack, milestones |
| `replica/design.md` | design | Original design system + new name |
| `replica/progress.md` | build/auth/payments | Screen-by-screen checklist |
| `replica/test-report.md` | test | Bugs found and fixed |
| `replica/legal-checklist.md` | legal | Trademark / terms / lawyer checklist |
