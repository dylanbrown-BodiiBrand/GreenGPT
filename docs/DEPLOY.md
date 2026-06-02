# Production deploy checklist (Day 7)

## Vercel environment variables

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

- [ ] Pro checkout on production
- [ ] Entitlement API
- [ ] .ics export + email calendar
- [ ] Manual `POST /api/reminders/send` with cron secret (optional)
- [ ] Document upload (Pro user)
- [ ] `/projects` page loads

## Regression

```bash
npm run lint
npm test
npm run build
```
