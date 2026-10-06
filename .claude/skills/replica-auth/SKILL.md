---
name: replica-auth
description: Replica step 7. Add sign-up, login, logout, sessions and route protection to the rebuild using a maintained auth provider or the framework's official auth library — never hand-rolled crypto. Use for /replica-auth, "add logins", "add accounts", "protect these pages".
---

# replica-auth — logins

**Job:** working accounts for the roles the slice needs, and protected routes.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/plan.md`, `replica/screens.json`.

## Steps
1. List roles from `screens.json` (visitor, user, admin, invitee…) and which
   screens each may see. Confirm with the user.
2. Use the provider in `plan.md` (or recommend one: hosted provider such as
   Clerk/Supabase Auth/Auth.js). Read its current docs for this framework version.
3. Implement: sign-up, login, logout, password reset or magic link, optional
   Google OAuth, session handling, server-side route protection, and a
   `user_id` foreign key on owned data.
4. Enforce authorization on the server for every read/write of owned data
   (row-level security or explicit checks). Never trust client-side checks.
5. Add secrets to `.env.example` (names only).
6. Tests: unauthenticated access is redirected/denied; user A can't read user
   B's data; login/logout round-trip.
7. Run lint, typecheck, tests. Tick auth in `replica/progress.md`. Commit.

Never ask the user for production secrets in chat — tell them where to paste
them (`.env.local`, hosting dashboard).
