-- contact_submissions
-- Run this in the Supabase SQL editor (or via migrations) before using POST /api/contact.
-- Why: the API inserts into `contact_submissions` using the Supabase anon key, so the table must exist
-- and Row Level Security must allow INSERT for the `anon` role (same pattern as `email_list`).

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  name text not null,
  email text not null,
  company text null,
  phone text null,
  message text not null,
  source text not null default 'home'
);

alter table public.contact_submissions enable row level security;

-- Allow public submissions from the website (anon key).
drop policy if exists "Allow anon insert contact_submissions" on public.contact_submissions;
create policy "Allow anon insert contact_submissions"
on public.contact_submissions
for insert
to anon
with check (true);

-- Optional: tighten reads (recommended). Service role bypasses RLS for admin tooling.
drop policy if exists "Disallow public reads contact_submissions" on public.contact_submissions;
create policy "Disallow public reads contact_submissions"
on public.contact_submissions
for select
to anon
using (false);
