-- Deadline reminders (Pro/Enterprise email alerts)
create table if not exists public.deadline_reminders (
  id bigserial primary key,
  user_email text not null,
  obligation_id text not null,
  obligation_name text not null,
  deadline_date date not null,
  reminded_30 boolean not null default false,
  reminded_60 boolean not null default false,
  reminded_90 boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_email, obligation_id, deadline_date)
);

create index if not exists deadline_reminders_email_idx on public.deadline_reminders (user_email);
create index if not exists deadline_reminders_date_idx on public.deadline_reminders (deadline_date);

-- Obligation document attachments (EHS calendar; not RAG documents table)
create table if not exists public.obligation_documents (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  obligation_id text not null,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists obligation_documents_lookup_idx
  on public.obligation_documents (user_email, obligation_id);

-- Storage: create private bucket `obligation-files` in Supabase Dashboard (or API).
