---
name: replica-payments
description: Replica step 8. Wire payments for the paid flow — checkout, subscriptions or one-off charges, verified webhooks, and entitlement checks — in test mode first. Use for /replica-payments, "add Stripe", "charge for this", "add subscriptions".
---

# replica-payments — get paid

**Job:** the paid flow takes money in test mode and grants access correctly.

Read `.claude/skills/_replica/GUARDRAILS.md`, `replica/plan.md`, `replica/pitch.md`
(pricing angle).

## Steps
1. Confirm the model: one-off, subscription, per-seat, usage, or marketplace
   payouts. Confirm prices — don't copy the original's tiers or tier names.
2. Use the provider in `plan.md` (default Stripe Checkout + Customer Portal;
   use a provider that serves the user's country if Stripe doesn't).
3. Implement:
   - Server-side checkout session creation (prices from server config, never
     from the client).
   - Webhook endpoint with **signature verification** and **idempotency**
     (store processed event ids).
   - Entitlement record per user/org, updated only by webhooks.
   - Server-side gate on paid features reading the entitlement.
   - Billing page: current plan, manage/cancel link, receipts.
4. Test mode only. Add keys to `.env.example`. Document the webhook URL to
   register and the CLI command to forward webhooks locally.
5. Tests: webhook rejects bad signatures; duplicate events are no-ops; paid
   gate denies unpaid users; happy path with test card.
6. Run checks, tick payments in `replica/progress.md`, commit.

Remind the user: going live needs `/replica-legal` (terms, refund policy,
privacy policy, tax registration questions) first.
