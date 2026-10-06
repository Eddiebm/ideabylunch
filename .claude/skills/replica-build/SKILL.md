---
name: replica-build
description: Replica step 6. Rebuild the planned slice screen by screen from the recon inventory — one screen per pass, implemented from its described behavior in the new brand, never from the original's code or copy. Use for /replica-build, /replica-build <screen-id>, "build the next screen", "continue the rebuild".
---

# replica-build — one screen at a time

**Job:** implement the next unchecked screen in `replica/progress.md` (or the
screen id passed as an argument), end to end, then stop.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/plan.md`,
`replica/screens.json`, `replica/design.md`, and `replica/pitch.md`.

## Per screen
1. Restate the screen's purpose, inputs, outputs and data from `screens.json`
   in one short paragraph. That paragraph is your spec — work from it, not from
   memory of how the original looks.
2. If a review fix from `pitch.md` touches this screen, build the fixed version.
3. Implement: route/page, components, data reads/writes, validation, loading,
   empty and error states, mobile layout. Use design tokens only — no hardcoded
   colors.
4. Write all user-facing text fresh in the voice from `design.md`.
5. Add tests: unit for logic, one e2e path through the screen.
6. Run lint, typecheck, tests. Fix failures.
7. Run the brand guard as a quick check:
   `node .claude/skills/replica-deploy/scripts/brand-guard.mjs`
8. Tick the screen in `replica/progress.md`, commit "build: <screen name>".

If the screen needs login or payment and those milestones aren't done, stub
them behind a clear TODO and tell the user to run `/replica-auth` or
`/replica-payments`.

Report what was built and what's next. Don't start a second screen unless the
user asks you to keep going.
