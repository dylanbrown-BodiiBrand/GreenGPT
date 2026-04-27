-- Stripe subscription entitlement (MVP: keyed by customer email)
create table if not exists public.subscriptions (
  customer_email text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'none',
  tier text not null default 'free',
  last_event_id text,
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_tier_idx on public.subscriptions (tier);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- Calendar email delivery log
create table if not exists public.calendar_email_sends (
  id bigserial primary key,
  request_id text not null,
  email text not null,
  status text not null,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists calendar_email_sends_email_idx on public.calendar_email_sends (email);
create index if not exists calendar_email_sends_status_idx on public.calendar_email_sends (status);
