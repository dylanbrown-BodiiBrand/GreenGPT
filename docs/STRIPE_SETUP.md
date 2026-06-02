# Stripe & billing setup (Day 1)

## Fix `.env.local`

Copy [`.env.example`](../.env.example) and set:

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | Dashboard → Developers → API keys. Must be `sk_test_...` or `sk_live_...` (not `mk_...`) |
| `STRIPE_PRO_PRICE_ID` | Products → Pro → **Price** ID (`price_...`, not `prod_...`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; `https://greengptadvisory.com` in production |
| `STRIPE_WEBHOOK_SECRET` | From Stripe CLI (`stripe listen`) or Dashboard webhook |

## Supabase

Run [`docs/sql/ehs_billing_and_delivery.sql`](sql/ehs_billing_and_delivery.sql) and [`supabase/migrations/20260601_launch_features.sql`](../supabase/migrations/20260601_launch_features.sql).

## Local webhook

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

## E2E test

1. `npm run dev` → `/` → enter email → Upgrade to Pro
2. Card `4242 4242 4242 4242`
3. Confirm `subscriptions` row and `GET /api/billing/entitlement?email=...`
4. Export .ics and Email my calendar as Pro user
