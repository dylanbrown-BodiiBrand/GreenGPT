# Production deploy checklist (Day 7)

## Vercel environment variables

Audited Jun 4, 2026 via `node scripts/verify-vercel-env.mjs` (production API probes). All required vars respond correctly on production. Optional: `STRIPE_ENTERPRISE_PRICE_ID` not set locally or required for Pro flow.

Set all values from [`.env.example`](../.env.example):

- `NEXT_PUBLIC_APP_URL=https://greengptadvisory.com`
- `STRIPE_SECRET_KEY` (live `sk_live_...`)
- `STRIPE_PRO_PRICE_ID` (live `price_...`)
- `STRIPE_WEBHOOK_SECRET` (production webhook signing secret)
- `STRIPE_ENTERPRISE_PRICE_ID` (optional, for Enterprise tier mapping)
- `CRON_SECRET` (random string; Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`)
- Supabase, Resend, OpenAI keys

## Supabase

1. Run `docs/sql/ehs_billing_and_delivery.sql`
2. Run `supabase/migrations/20260601_launch_features.sql`
3. Create Storage bucket **`obligation-files`** (private)

## Stripe

- Live webhook: `https://greengptadvisory.com/api/billing/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## Smoke test

Run: `node scripts/verify-production-workflow.mjs` (loads `.env.local` for `CRON_SECRET`).

- [x] Pro checkout on production — `verify-stripe-e2e.mjs` (paid session + `subscriptions` row)
- [x] Entitlement API — Pro `tier=pro` / `active`
- [x] .ics export + email calendar — export 200 + Resend `{ ok: true }`; free tier 403
- [x] Manual `POST /api/reminders/send` with cron secret — 200, `sent=0`
- [x] Document upload (Pro user) — upload + list OK
- [x] `/projects` page loads — HTTP 200

## Regression

```bash
npm run lint
npm test
npm run build
```
