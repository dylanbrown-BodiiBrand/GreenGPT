-- Enable RLS on tables previously accessed only via service role.
-- Service role bypasses RLS; anon/authenticated are denied until explicit policies are added.
-- Run in Supabase SQL editor when ready (no app code dependency).

alter table if exists public.deadline_reminders enable row level security;
alter table if exists public.obligation_documents enable row level security;
alter table if exists public.subscriptions enable row level security;
alter table if exists public.calendar_email_sends enable row level security;

-- Future client portal: users read/write rows keyed to their verified email.
-- Uncomment after customer auth is live in production.

-- create policy "deadline_reminders_select_own"
--   on public.deadline_reminders for select to authenticated
--   using (lower(user_email) = lower(auth.jwt()->>'email'));

-- create policy "obligation_documents_select_own"
--   on public.obligation_documents for select to authenticated
--   using (lower(user_email) = lower(auth.jwt()->>'email'));

-- create policy "subscriptions_select_own"
--   on public.subscriptions for select to authenticated
--   using (lower(customer_email) = lower(auth.jwt()->>'email'));
