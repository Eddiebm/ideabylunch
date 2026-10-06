---
name: replica-test
description: Replica step 9. Hunt for bugs in the rebuild — run the suite, drive every flow in a real browser, probe edge cases, auth and payment abuse — then fix what's found and record it. Use for /replica-test, "test it for bugs", "QA the rebuild", "is it ready".
---

# replica-test — find and fix bugs

**Job:** `replica/test-report.md` with every bug found, its fix, and a
regression test.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/screens.json`,
`replica/progress.md`, and `replica/reviews.md` (the original's `bugs` theme
tells you what users hit — make sure yours doesn't).

## Passes
1. **Baseline:** install, lint, typecheck, unit, e2e, production build. Record
   results.
2. **Flows:** in a real browser (Playwright), run every flow in `screens.json`
   that is built, desktop and mobile viewport. Screenshot failures.
3. **Edge cases per form:** empty, max length, unicode/emoji, time zones and
   DST (critical for anything with dates), double-submit, back button, slow
   network, refresh mid-flow.
4. **Security:** unauthenticated access to every route and API; cross-user data
   access (IDOR); webhook without signature; injection in inputs; secrets in
   client bundle; open redirects.
5. **Original's known bugs:** for each complaint in the `bugs/reliability`
   theme, write a test proving the rebuild doesn't have it.
6. **Brand:** run `node .claude/skills/replica-deploy/scripts/brand-guard.mjs`.

## Fix loop
For each bug: severity (blocker/major/minor), repro steps, root cause, fix,
regression test. Fix blockers and majors now; list minors.

Write `replica/test-report.md`, tick test in `replica/progress.md`, commit.
Say plainly whether it's ready to deploy and what's left.
