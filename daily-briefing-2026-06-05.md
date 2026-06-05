# GreenGPT Daily Briefing — June 5, 2026

**Status:** Stripe integration blocked; unblock it today and you're ready to test end-to-end.

---

## 🔴 Top 3 Priorities

**1. Fix STRIPE_SECRET_KEY**
In `.env.local`, your key starts with `mk_` — wrong. Replace it with a key starting with `sk_test_` (test mode) or `sk_live_` (production). Find it in Stripe Dashboard → Developers → API Keys.

**2. Fix STRIPE_PRO_PRICE_ID**
Currently set to a Product ID (`prod_...`). You need a Price ID (`price_...`). Go to Stripe Dashboard → Products → your Pro product → copy the Price ID from the pricing section.

**3. Add NEXT_PUBLIC_APP_URL to .env.local**
This key is missing entirely. Your checkout route reads `NEXT_PUBLIC_APP_URL`, but the app sets `NEXT_PUBLIC_BASE_URL` — mismatch causes 503 errors. Add:
```
NEXT_PUBLIC_APP_URL=https://greengptadvisory.com
```
(or `http://localhost:3000` for local testing)

➡️ **After all 3:** Run the full Stripe → webhook → Supabase end-to-end test (subscription creation, webhook receipt, DB update).

---

## 🟡 Open Items (next up)

- **Pro gating in EHSCalendarGenerator** — swap local React state for a `/api/billing/entitlement` call on load (security fix)
- **Enterprise feature gating** — UI exists, logic not implemented
- **.ics export & "Email my calendar"** — needs live Stripe test once keys are fixed
- **Email reminders (30/60/90 day)** — new Supabase table + `/api/reminders` + Vercel Cron
- **Document attachments** — Supabase Storage bucket + schema + upload UI
- **ISO 14001/45001/50001 ingestion** — run through `/api/register-file` pipeline when ready

---

Three env var fixes stand between you and a working payments system — ship those and the whole Stripe flow unlocks.
