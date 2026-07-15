# GreenGPT — Security Review

**Date:** 2026-06-26
**Scope:** `src/` application code (Next.js 15 / App Router), API routes, auth, Supabase + Stripe integration, env config, dependencies.
**Method:** Manual source review + `npm audit`.

---

## Summary

The app has a clean, working admin auth flow (Supabase magic-link + email allowlist + middleware), but the **customer-facing API surface authorizes by an email address supplied in the request** rather than by an authenticated session, and most of those routes run with the **Supabase service-role key** (which bypasses Row Level Security). The net effect is that anyone who knows (or guesses) a customer's email can read their uploaded documents, manage their billing, and read their entitlement. Separately, **live production secrets are sitting in `.env.local` in plaintext** and several AI endpoints are open, unauthenticated proxies to paid APIs.

| # | Severity | Issue |
|---|----------|-------|
| 1 | Critical | Live production secrets stored in `.env.local` |
| 2 | Critical | Broken access control / IDOR — email-as-identity on service-role routes |
| 3 | High | Unauthenticated, unthrottled AI proxies (`/api/greengpt`, `/api/ask`) |
| 4 | High | Unauthenticated RAG ingestion (`/api/register-file`, `/api/index-now`) |
| 5 | Medium | No rate limiting / anti-abuse on any public endpoint |
| 6 | Medium | RLS not enabled on `obligation_documents` / `deadline_reminders` |
| 7 | High | Vulnerable dependencies (18 advisories, 10 high — incl. `next` itself) |
| 8 | Low | Internal error messages leaked to clients; raw request-body logging |
| 9 | Low | No security headers; `console.log` of full OpenAI responses |

---

## 1. Live production secrets in `.env.local` — Critical

`.env.local` contains **live, working credentials** in plaintext:

- `STRIPE_SECRET_KEY=rk_live_...` (live restricted key) and `STRIPE_WEBHOOK_SECRET=whsec_...`
- `SUPABASE_SERVICE_ROLE_KEY=...` — full DB access, **bypasses all RLS**
- `OPENAI_API_KEY=sk-proj-...`, `RESEND_API_KEY=re_...`, `LLAMA_CLOUD_API_KEY=llx-...`
- `CRON_SECRET=...` — the only thing protecting `/api/reminders/send`

The file is correctly listed in `.gitignore` and is **not** currently tracked by git (verified), which is good — but the secrets are still present on disk in the project folder and have effectively been shared/exposed. The service-role key and the live Stripe key are the most damaging.

**Fix**
- **Rotate every key above now** (Stripe, Supabase service-role + anon, OpenAI, Resend, LlamaCloud, and regenerate `CRON_SECRET`). Treat them as compromised.
- Store real values only in the Vercel/host secret manager. Keep `.env.local` empty or pointed at non-prod sandboxes.
- Confirm the secrets never entered git history on any branch/remote (`git log --all -p` / GitHub secret scanning). Rotation is required regardless.

## 2. Broken access control (IDOR) — email as identity — Critical

Multiple routes treat an **email passed in the request** as proof of identity, then run queries with the **service-role client** (`getSupabaseAdmin()`), which ignores RLS. There is no session/ownership check tying the caller to that email.

- `GET /api/documents/list?email=<victim>&obligationId=...` — `src/app/api/documents/list/route.ts` returns **signed download URLs** for any user's uploaded compliance documents. Supply a known customer email → download their files.
- `POST /api/documents/upload` — `documents/upload/route.ts` writes into `"<email>/..."` storage paths for any email.
- `POST /api/billing/portal` — `billing/portal/route.ts` creates a **Stripe billing portal session for any paying customer's email** (view invoices, change/cancel subscription, update payment method).
- `GET /api/billing/entitlement?email=` — enumerate any email's plan/status.
- `POST /api/ehs-calendar/{email,export,sync-reminders}` — generate/email/sync data keyed to any email.

`requireProEmail()` (`src/lib/billing/entitlementServer.ts`) only checks that *the email* has a Pro plan — not that the *caller* owns it. So it gates the feature, not the user.

**Fix**
- Require an authenticated session and derive the email **server-side** from `supabase.auth.getUser()` — never trust an email from the body/query. Build a customer auth flow (the admin pattern already in the repo is a good template) instead of email-only identity.
- For routes that legitimately need elevated access, scope queries with `.eq("user_email", session.email)` using the session value, and prefer the anon client + RLS over the service-role client wherever possible.
- For the Stripe portal/entitlement, look up the customer from the authenticated session only.

## 3. Unauthenticated, unthrottled AI proxies — High

- `POST /api/greengpt` (`greengpt/route.ts`) forwards arbitrary user input straight to OpenAI using your API key, with **no auth and no rate limit** — an open proxy that bills your OpenAI account. It also `console.log(data)` the full upstream response.
- `POST /api/ask` (`ask/route.ts`) is unauthenticated, uses the **service-role key** plus OpenAI embeddings + chat on every call. Cost-amplification and abuse vector (each request = embeddings + vector RPC + completion).

**Fix**
- Put these behind authentication and per-user/IP rate limits + a monthly budget cap. Consider removing `/api/greengpt` entirely if `/api/ask` supersedes it. Don't log full model responses.

## 4. Unauthenticated RAG ingestion — High

- `POST /api/register-file` (`register-file/route.ts`) accepts an attacker-controlled `objectKey`, mints a signed URL for **any object in the `rag-source` bucket**, fetches it, writes a `documents` row, and triggers indexing — all with the service-role key and no auth. This allows reading arbitrary bucket objects and poisoning the RAG corpus / racking up LlamaParse + embedding costs.
- `POST /api/index-now` (`index-now/route.ts`) is likewise unauthenticated and will parse/embed any `documentId`.

**Fix**
- Authenticate both (admin-only, or a shared secret like the cron pattern). Validate/whitelist `objectKey` prefixes. Don't expose ingestion endpoints publicly.

## 5. No rate limiting / anti-abuse on public endpoints — Medium

`/api/contact`, `/api/intake`, `/api/email-list` accept anonymous POSTs with no captcha, throttle, or dedupe. `/api/intake` also **sends an email via Resend on every submission**, so it can be used for spam/DB flooding and to burn Resend quota. Email validation is present but loose.

**Fix**
- Add rate limiting (e.g. Vercel/Upstash), a captcha or honeypot on public forms, and unique constraints to dedupe. Cap intake alert emails.

## 6. RLS gaps — Medium

`20260601_launch_features.sql` creates `deadline_reminders` and `obligation_documents` **without enabling RLS** (RLS is only enabled for `contact_submissions` and `facility_intakes`). Today these are reached via the service-role key so RLS wouldn't apply, but if the anon key (which is public by design) is ever used against them, or policy assumptions change, they're wide open. The `subscriptions` table (defined only in `docs/sql/...`) likewise has no RLS shown.

**Fix**
- Enable RLS on every table and write explicit policies (default deny). Rely on RLS + anon key for user-scoped reads instead of the service-role key.

## 7. Vulnerable dependencies — High

Full `npm audit` (including the dev/build chain) reports **18 advisories (10 high, 8 moderate)**. Notable:
- **`next@15.4.8` — high.** Two advisories: Server Actions source-code exposure, and DoS via Server Components. This is a production dependency; upgrade is the priority here.
- `form-data` — CRLF injection via unescaped multipart field names (high)
- `tar` — arbitrary file overwrite / symlink poisoning via path sanitization (high)
- `@xmldom/xmldom` — XML injection + DoS via uncontrolled recursion (high)
- `tmp` — path traversal (high); `underscore` — DoS via unbounded recursion (high)
- `vite`, `mammoth` (directory traversal), `uuid` (buffer bounds check) — high/moderate, mostly dev/transitive

(A prod-only scan, `--omit=dev`, shows ~13; the higher number is the full tree and is the right figure for a security review since build-time tooling is also a supply-chain risk.)

**Fix**
- Upgrade `next` to the latest 15.x security release first. Run `npm audit fix`, then handle remaining forced/breaking upgrades deliberately (review the `exceljs`/`uuid` chain rather than blindly downgrading). Re-audit until clean.

## 8. Information disclosure — Low

Routes return raw `error.message` / DB errors to the client (e.g. `documents/*`, `billing/*`, `ehs-calendar/*`), leaking schema and internals. `makeLogger` in `src/utils/debug.ts` logs **raw request bodies** when `DEBUG_RAG=1` (redaction is partial — only `Bearer`/`authorization`/`token=` strings).

**Fix**
- Return generic errors to clients; log details server-side only. Ensure `DEBUG_RAG` is off in prod and broaden redaction.

## 9. Hardening — Low

- No security headers configured — `next.config.ts` is empty. Add CSP, `X-Content-Type-Options`, `X-Frame-Options`/frame-ancestors, HSTS, Referrer-Policy.
- `greengpt/route.ts` logs full OpenAI payloads to the console.
- `daily-briefing-2026-06-05.md` and similar artifacts in the repo may contain PII/business data — keep operational data out of the source tree.

---

## Priority order

1. Rotate all secrets in `.env.local` (#1).
2. Replace email-as-identity with authenticated sessions on every customer route (#2), then lock down the AI + RAG endpoints (#3, #4).
3. Add rate limiting (#5) and enable RLS everywhere (#6).
4. Patch dependencies (#7) and clean up error/log hygiene + headers (#8, #9).

*This review is based on static reading of the current source; it is not a guarantee of completeness. A follow-up dynamic test (authenticated + unauthenticated) is recommended after fixes.*
