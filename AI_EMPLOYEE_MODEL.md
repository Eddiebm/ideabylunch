# The Managed AI Employee — Service Model

*Internal reference. Not published. Captures the raw pitch (voice transcript, 2026-09-09) as a structured plan — see `agentos_reality_seed_v1.md` and `BUILD_PLAN.md` for how this repo turns rough ideas into build docs.*

---

## The pitch, condensed

Target customer is not a startup — it's the ordinary $1M+/year local business: gyms, clinics, agencies, home services, real estate offices. They have already bought a pile of software and still have the same four problems:

1. Leads that never get followed up
2. An inbox that keeps piling up
3. Reports nobody has time to build
4. Customers waiting too long for an answer

They don't want another login. They want it *handled*. That's the product.

## Why this is a different business than "build them an automation"

- **Freelance/automation model:** sell a workflow once, get paid once. It breaks in three weeks, nobody's on the hook to fix it, you spend your life patching dead workflows for free.
- **Managed AI employee model:** the client pays every month because the *outcome* keeps happening. You're not selling software or a workflow — you're hiring out a result and getting paid every month for it continuing to work.

That reframing is the whole point of this doc: price and sell an outcome, not a build.

## Unit economics (napkin math, stated honestly)

- Claude session-hour cost: ~$0.08/hr. That number is real but it is **not** the whole cost — anyone claiming it is the whole cost is selling something.
- Real all-in cost per client also includes: token spend (a busy agent burns a lot of them), data plumbing (syncing/hosting the client's unified data store), and your own ongoing time keeping the thing alive.
- All-in estimate: **a few hundred dollars/month** to run one well-built AI employee.
- Sell price: **$2,000–$5,000/month** per client (you're replacing hours of human labor, not competing with SaaS seat pricing).
- 10 clients at that spread ≈ $50k/month. **Getting to 10 is the hard part** — this doc doesn't solve sales/distribution, only the build.

## Architecture — build in this order

### 1. One database (the brain) — build this first, not the agent

Every prospective client already has their data scattered: CRM, spreadsheet, booking app, email inbox, some old database nobody opens. Before any agent touches anything:

- Pull everything into **one** unified data store per client.
- This is the single most important piece of the build. An agent with no context is a confident intern guessing; an agent's value comes from everything it already knows about the business, so it needs a real, current, single source of truth.
- Practically: define a per-client schema (contacts/leads, interactions, bookings/orders, inbox threads, report metrics) and an ingestion job per source system rather than a bespoke one-off each time.

### 2. Skills on top of Claude — not a custom dashboard

- **Don't** build a bespoke React dashboard with charts per client. It's months of work competing against something Claude already does better.
- Keep the actual work happening in the chat/agent surface itself (Claude). Add narrow, single-purpose **skills** on top:
  - Daily lead follow-up
  - Weekly report generation
  - Scheduling next month's content
  - (client-specific skills as needed — each does one job, writes its result back into the one database)
- The client gets one simple place to log in and see everything (state), with a handful of tight skills doing the recurring work underneath (behavior). That split — one brain, Claude on top, scoped skills — is the whole architecture. No custom app to maintain per client.

### 3. Approve/reject loop — this is what gets a nervous owner to sign

- The agent drafts the work (an email, a report, a follow-up); a human clicks **Approve**, **Rewrite**, or **Reject**. That's the entire product surface for the owner.
- This does two things at once:
  1. The owner trusts it because a human still signs off on every decision — you're not selling "robots," you're selling "automate 90% of the work, you click approve."
  2. Every approve/reject is a training signal: the agent learns the business's voice and priorities over time. This loop — not any single skill — is the real moat, because it's what makes the agent get better *at this specific client* the longer they stay, which is also what makes the monthly-retainer pricing model defensible instead of arbitrary.
- Most owners aren't ready to hand a decision fully to AI. They are ready to automate the grunt work and click a button. Sell that framing explicitly.

## What "done" looks like per client (draft — mirrors `SERVICE_DEFINITION.md` style)

- [ ] Client's scattered data sources identified and mapped
- [ ] Unified per-client database stood up and backfilled
- [ ] Ingestion/sync jobs running for each live source (CRM, inbox, booking, spreadsheet)
- [ ] Skills built for the client's top 1-3 recurring pains (from the four problems above)
- [ ] Approval surface live (owner can approve/rewrite/reject each generated item)
- [ ] Weekly report skill running and landing in the client's login view
- [ ] Retainer billing set up (monthly, tied to the outcome continuing — not a one-time invoice)

## Explicit non-goals for v1

- No custom per-client dashboard/UI beyond the shared login view backed by the one database
- No handing the agent unsupervised send/execute rights before the approval loop has enough history with that client
- No solving distribution/sales in this doc — the architecture above assumes a client already said yes

## Open questions to resolve before building

- Which "one database" substrate to standardize on across clients (so this isn't rebuilt bespoke per client) — likely Postgres/Supabase given the rest of this repo's stack (Full Product tier already uses Supabase).
- Where the approval UI lives: a `/dashboard` surface in this app (consistent with the existing `app/dashboard/autopilot` pattern used for First Transaction Autopilot) vs. a separate per-client app.
- Which four-problems skill to build first as the wedge (lead follow-up looks like the strongest fit for this repo's existing lead/CRM-adjacent code).
