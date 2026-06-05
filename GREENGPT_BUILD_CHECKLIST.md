# GreenGPT Build Checklist
**Site:** greenGPTadvisory.com  
**Stack:** Next.js 15 · Supabase · Stripe · Resend · OpenAI  
**Launch target:** 1 week

---

## How to use this file
- `[ ]` = not done
- `[x]` = done
- Check items off as you complete them in Cursor
- Work top-to-bottom — items higher up unblock items below

---

## 🔴 PHASE 1 — Stripe Unblocking (Day 1)
> Nothing in the payment flow works until these 3 env vars are fixed.

### Fix .env.local
- [x] **STRIPE_SECRET_KEY** — production verified (`node scripts/verify-vercel-env.mjs`); local uses live key
- [x] **STRIPE_PRO_PRICE_ID** — production checkout returns session URL
- [x] **NEXT_PUBLIC_APP_URL** — set to `https://greengptadvisory.com` on Vercel

**Code/docs:** See [`.env.example`](.env.example) and [`docs/STRIPE_SETUP.md`](docs/STRIPE_SETUP.md).

**Files to edit:**
```
.env.local
```

### End-to-End Test Sequence (run after env fixes)
- [x] Test 1 — Production checkout session (`/api/billing/checkout`) — verified Jun 4, 2026
- [x] Test 2 — Completed Stripe checkout on production (`node scripts/verify-stripe-e2e.mjs`)
- [x] Test 3 — Supabase `subscriptions` row: `tier=pro`, `status=active`, Stripe customer/subscription IDs
- [x] Test 4 — `GET /api/billing/entitlement?email=dylanbrown416@gmail.com` → `pro` / `active`
- [x] Test 5 — Pro export + email APIs return 200 (no upgrade block)

---

## 🟡 PHASE 1.5 — Fix Partial Features (Day 2)

### Pro Frontend Gating in EHSCalendarGenerator
**Status:** Built but insecure — plan stored in local React state, bypassed in browser devtools  
**Fix:** On component mount, call `/api/billing/entitlement` and use the response to set plan state server-side

- [x] Open `components/EHSCalendarGenerator.tsx` (or similar)
- [x] Removed `startProLocal()` bypass — upgrade requires checkout callback or modal
- [x] `EHSCalendarLanding.tsx` gates Pro on `/api/billing/entitlement` (primary UI at `/`)
- [ ] Test: log in as free user → Pro features should be locked

**Files:**
```
components/EHSCalendarGenerator.tsx
app/api/billing/entitlement/route.ts
```

### Enterprise Feature Gating
**Status:** UI exists, logic not implemented  

- [x] Webhook maps `STRIPE_ENTERPRISE_PRICE_ID` → `tier = enterprise`
- [x] Landing uses `isEnterpriseTier` / `hasProAccess` (Pro includes Enterprise features)
- [x] Test with enterprise tier — `node scripts/verify-enterprise-tier.mjs` (temporary row + entitlement + export)

### Verify .ics Export Against Real Stripe Sub
**Status:** Built — needs live test  

- [x] Subscribe to Pro via Stripe checkout (production E2E verified)
- [x] Export .ics — `POST /api/ehs-calendar/export` returns valid `BEGIN:VCALENDAR` (9755 bytes)
- [x] Confirm valid events in .ics payload
- [x] Free user blocked — HTTP 403 on export

**Files:**
```
src/app/api/ehs-calendar/export/route.ts
```

### Verify "Email My Calendar" Against Real Stripe Sub
**Status:** Built — needs live test  

- [x] As a Pro user, `POST /api/ehs-calendar/email` → `{ ok: true }` (Resend on Vercel)
- [x] Check inbox at dylanbrown416@gmail.com for the .ics attachment (sent Jun 4, 2026)
- [ ] Confirm the email renders correctly and the .ics opens in a calendar app (manual inbox check)
- [x] Free user blocked — HTTP 403 on email

**Files:**
```
src/app/api/ehs-calendar/email/route.ts  (now requires Pro/Enterprise)
```

---

## 🔴 PHASE 2 — New Features (Days 3–6)

### Email Reminder Logic (30/60/90 days before deadlines)
**Status:** Not built — largest unbuilt feature  
**What's needed:** Supabase table + API route + Vercel Cron job

- [x] Create Supabase table `deadline_reminders` — see `supabase/migrations/20260601_launch_features.sql`
- [x] Create `app/api/reminders/send/route.ts` — cron auth via `CRON_SECRET`
- [x] Create `vercel.json` cron (daily 13:00 UTC)
- [x] Sync deadlines on export/email/generate via `sync-reminders` + export/email hooks
- [ ] Test: insert a fake deadline 29 days from today → run the route manually → confirm email arrives
- [x] Cron route: `POST /api/reminders/send` with `CRON_SECRET` → 200 (`sent=0` when no bucket match)
- [x] `deadline_reminders` rows created on export/email for Pro user
- [x] Mark `reminded_30 = true` after send so it doesn't re-send

**Files created:**
```
src/app/api/reminders/send/route.ts
src/app/api/ehs-calendar/sync-reminders/route.ts
vercel.json
supabase/migrations/20260601_launch_features.sql
```

### Document Attachments
**Status:** Not built — advertised in UI, zero backend  
**What's needed:** Supabase Storage bucket + schema + upload UI

- [x] Create Supabase Storage bucket named `obligation-files` (private) — upload API returns 200 on production
- [x] Add `obligation_documents` table — migration file
- [x] Create `app/api/documents/upload/route.ts`
- [x] Create `app/api/documents/list/route.ts`
- [x] Add `DocumentUploader` on timeline obligations (Pro/Enterprise)
- [x] Test: upload a PDF → production upload + list verified (`verify-production-workflow.mjs`)

**Files created:**
```
src/app/api/documents/upload/route.ts
src/app/api/documents/list/route.ts
src/app/components/DocumentUploader.tsx
supabase/migrations/20260601_launch_features.sql
```

### Multi-Facility Support
**Status:** Deferred post-launch  
**Scope decision needed:** Basic (UI switcher only) vs Full (separate data per facility)

- [x] Deferred to post-launch (per scope decision)
- [ ] Basic: add `facilities` table (`id`, `user_email`, `name`, `state`, `industry`), add facility selector dropdown to nav/header
- [ ] Wire calendar generation to use selected facility's state/industry instead of user default
- [ ] Test: create 2 facilities with different states → switch between them → confirm calendar events change

**Files to create/edit:**
```
app/api/facilities/route.ts
components/FacilitySwitcher.tsx
supabase/migrations/add_facilities.sql
components/EHSCalendarGenerator.tsx   (update to read selected facility)
```

### Project/Client Photos & Case Study Sections
**Status:** Static marketing gallery on `/projects` — upload deferred post-launch  

- [x] `ProjectGallery` with tabs + lightbox on `/projects`
- [x] Upload/case-study CMS deferred post-launch

**Files to edit/create:**
```
components/ProjectGallery.tsx
app/api/projects/photos/upload/route.ts
supabase/migrations/add_project_photos.sql
```

---

## 🔴 PHASE 3 — Later / Post-Launch

### Admin / Backend Dashboard
**Status:** Not built  
**What's needed:** Protected route showing user list, subscription status, feature usage

- [ ] Create `/app/admin/` route with middleware that checks for admin email
- [ ] Build table showing: user email, plan, subscription start date, last login
- [ ] Pull data from Supabase `subscriptions` table
- [ ] Add basic analytics: total Pro subscribers, total Enterprise subscribers, total users

**Files to create:**
```
app/admin/page.tsx
app/admin/layout.tsx   (with auth guard)
middleware.ts          (protect /admin route)
```

### User Account / Login System
**Status:** Not built — app is currently email-keyed by design  
**Note:** Discuss with Matt whether this is in launch scope

- [ ] Decide: Supabase Auth (simplest) vs custom auth vs NextAuth
- [ ] If Supabase Auth: enable Email provider in Supabase Dashboard → Authentication → Providers
- [ ] Add sign-up / sign-in pages
- [ ] Replace email-keyed entitlement lookups with session-based user ID lookups
- [ ] Test full auth flow: sign up → verify email → sign in → access Pro features

---

## 🟢 GreenGPT AI Expansion

### Add ISO 14001, 45001 & 50001 Docs
**Status:** Pipeline ready — just needs docs uploaded  

- [ ] Have ISO PDFs ready (PDF format preferred for best LlamaParse output)
- [ ] Upload each PDF to Supabase Storage (Dashboard → Storage → your docs bucket)
- [ ] For each file, call the ingestion pipeline:
  ```bash
  curl -X POST https://yourdomain.com/api/register-file \
    -H "Content-Type: application/json" \
    -d '{"filePath": "path/to/iso-14001.pdf", "title": "ISO 14001:2015"}'
  ```
- [ ] Check Supabase → `documents` table → confirm `status = ready`
- [ ] Check Supabase → `chunks` table → confirm 200–400 rows per document
- [ ] Test: ask GreenGPT "What are the key requirements of ISO 14001 clause 6.1?" → confirm it answers with a citation

**Files (already built — no code changes needed):**
```
app/api/register-file/route.ts
app/api/ask/route.ts
```

---

## 📋 Feature Status Summary

| Feature | Status | Priority |
|---|---|---|
| Stripe env vars fix | ✅ Production verified | Day 1 |
| Stripe end-to-end test | ✅ `scripts/verify-stripe-e2e.mjs` | Day 1 |
| Pro frontend gating | ✅ Code complete | Day 2 |
| Enterprise gating | ✅ Code complete | Day 2 |
| .ics export (live test) | ✅ Production verified | Day 2 |
| Email my calendar (live test) | ✅ Production verified | Day 2 |
| Email reminders (30/60/90d) | ✅ Code complete | Day 3 |
| Document attachments | ✅ Code complete | Day 4 |
| Multi-facility support | ⏸ Post-launch | — |
| Project photos & case studies | ✅ Static `/projects` | — |
| ISO 14001/45001/50001 ingestion | 🟢 Ready to run | Any day |
| Admin dashboard | 🔴 Not built | Post-launch |
| User auth/login system | 🔴 Not built | Post-launch |
| GreenGPT AI chat (RAG) | ✅ Functional | — |
| EHS Calendar rules engine | ✅ Functional | — |
| Stripe checkout route | ✅ Functional | — |
| Stripe webhook handler | ✅ Functional | — |
| Contact form | ✅ Functional | — |

---

*Last updated: June 4, 2026 — run `node scripts/verify-production-workflow.mjs` for smoke tests.*

**Verification scripts:** `scripts/verify-production-workflow.mjs`, `scripts/verify-stripe-e2e.mjs`, `scripts/verify-vercel-env.mjs`, `scripts/verify-enterprise-tier.mjs`
