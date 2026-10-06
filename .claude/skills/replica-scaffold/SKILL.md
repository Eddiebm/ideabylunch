---
name: replica-scaffold
description: Replica step 5. Create the empty, runnable project skeleton for the planned slice — framework, folders, design tokens, data schema, env template, lint and test setup — without building features yet. Use for /replica-scaffold, "set up the project", "start the codebase".
---

# replica-scaffold — the skeleton

**Job:** a project that installs, runs, and shows a placeholder home page in
the new brand. No feature screens.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/plan.md`, `replica/design.md`.

## Steps
1. If the folder already has a project, inspect it and only add what the plan
   needs. Otherwise generate one with the stack's official CLI (latest stable).
   Check the framework's installed docs for breaking changes before writing code.
2. Apply design tokens from `replica/design.md` (CSS variables / theme config)
   and the chosen fonts.
3. Create the data schema for the slice's entities only (migration or ORM schema).
4. Add `.env.example` listing every secret the plan needs, with comments on
   where to get each. Never write real secrets; make sure `.env*` is gitignored.
5. Add a test runner (unit + one browser/e2e smoke test that loads `/`).
6. Add a `README.md` in the new product's name: what it is, how to run, how to test.
7. Run install, lint, typecheck, tests, and the dev server; fix until all pass.
8. `git init` if needed and commit "scaffold".

Tick scaffold in `replica/progress.md`. Next: `/replica-build`.
