---
name: replica-plan
description: Replica step 3. Turn the recon inventory and review findings into a build plan — pick ONE first slice (the flow people pay for), choose a stack, and list milestones screen by screen. Use for /replica-plan, "plan the rebuild", "what should I build first".
---

# replica-plan — pick one slice and plan it

**Job:** write `replica/plan.md` and seed `replica/progress.md`.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/recon.md`,
`replica/screens.json`, and `replica/pitch.md` if it exists.

## 1. Pick the slice
Default recommendation: **start with one slice — the one flow people pay for.**
Propose it with the screens it needs (minimum set), and the top review fix that
fits inside it. Ask the user to confirm or pick another flow. Push back on
"rebuild everything" — it's the full-rebuild estimate from recon, not a weekend.

## 2. Pick the stack
If the folder already has a project, use its stack. Otherwise propose a boring,
well-documented default and say why, e.g. Next.js + Postgres (Supabase/Neon) +
an auth provider + Stripe, deployed to Vercel. Prefer hosted services over
self-built infra for the first slice. Ask once; don't bikeshed.

## 3. Write `replica/plan.md`
- Goal (one sentence, user's words) and who it's for.
- Slice: flow name, screens (ids from screens.json), out of scope list.
- Data model for the slice only (entities, fields, relations).
- Stack and accounts the user must create (with links to their signup pages).
- Milestones in order, each small enough to finish in one session:
  1. `/replica-design` — new name + design system
  2. `/replica-scaffold` — project skeleton
  3. `/replica-build` — screens, one per step
  4. `/replica-auth` — logins (if the slice needs them)
  5. `/replica-payments` — payments (if money changes hands)
  6. `/replica-test` — bug hunt
  7. `/replica-legal` — checks before selling
  8. `/replica-deploy` — brand gate + ship
- Risks and unknowns from recon's open questions.

## 4. Seed `replica/progress.md`
A checklist: one line per milestone and one per screen, all unchecked.
Other skills tick items as they finish.

End by stating the slice and next command (`/replica-design`).
