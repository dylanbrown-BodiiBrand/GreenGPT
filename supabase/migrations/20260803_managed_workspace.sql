-- Managed EHS Workspace foundation (Phase 2)
-- Org-scoped facilities, obligations, corrective actions, and approved document metadata.
-- Access is membership-based. Service role bypasses RLS for admin provisioning only.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);
create index if not exists organization_members_email_idx
  on public.organization_members (lower(email));

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  state text,
  industry text,
  employee_count text,
  status text not null default 'active'
    check (status in ('active', 'pilot', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facilities_org_idx on public.facilities (organization_id);

create table if not exists public.obligations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  title text not null,
  source_document text,
  source_citation text,
  jurisdiction text,
  frequency text,
  due_date_rule text,
  owner_name text,
  evidence_required text,
  status text not null default 'draft'
    check (status in ('draft', 'reviewed', 'approved', 'needs_clarification', 'archived', 'open', 'overdue', 'completed')),
  review_state text not null default 'draft'
    check (review_state in ('draft', 'reviewed', 'approved', 'needs_clarification', 'archived')),
  last_reviewed_at date,
  next_due_at date,
  reviewer_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists obligations_org_idx on public.obligations (organization_id);
create index if not exists obligations_facility_idx on public.obligations (facility_id);
create index if not exists obligations_next_due_idx on public.obligations (next_due_at);

create table if not exists public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  finding text not null,
  description text,
  owner_name text,
  due_date date,
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'critical')),
  evidence_required text,
  evidence_link text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'awaiting_evidence', 'awaiting_review', 'closed')),
  reviewer_name text,
  reviewed_at timestamptz,
  source_references text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists corrective_actions_org_idx on public.corrective_actions (organization_id);
create index if not exists corrective_actions_facility_idx on public.corrective_actions (facility_id);
create index if not exists corrective_actions_due_idx on public.corrective_actions (due_date);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  obligation_id uuid references public.obligations(id) on delete set null,
  corrective_action_id uuid references public.corrective_actions(id) on delete set null,
  title text not null,
  required_proof text,
  status text not null default 'missing'
    check (status in ('missing', 'uploaded', 'reviewed', 'audit_ready')),
  file_path text,
  last_reviewed_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_items_org_idx on public.evidence_items (organization_id);
create index if not exists evidence_items_facility_idx on public.evidence_items (facility_id);

create table if not exists public.workspace_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  title text not null,
  doc_type text,
  approval_status text not null default 'draft'
    check (approval_status in ('draft', 'reviewed', 'approved', 'archived')),
  source_uri text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_documents_org_idx on public.workspace_documents (organization_id);

-- Membership helper (security definer to avoid recursive RLS)
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and (
        m.user_id = auth.uid()
        or lower(m.email) = lower(coalesce(auth.jwt()->>'email', ''))
      )
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

-- RLS
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.facilities enable row level security;
alter table public.obligations enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.evidence_items enable row level security;
alter table public.workspace_documents enable row level security;

drop policy if exists "orgs_select_member" on public.organizations;
create policy "orgs_select_member"
  on public.organizations for select to authenticated
  using (public.is_org_member(id));

drop policy if exists "org_members_select_self_org" on public.organization_members;
create policy "org_members_select_self_org"
  on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "facilities_select_member" on public.facilities;
create policy "facilities_select_member"
  on public.facilities for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "obligations_select_member" on public.obligations;
create policy "obligations_select_member"
  on public.obligations for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "corrective_actions_select_member" on public.corrective_actions;
create policy "corrective_actions_select_member"
  on public.corrective_actions for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "evidence_items_select_member" on public.evidence_items;
create policy "evidence_items_select_member"
  on public.evidence_items for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "workspace_documents_select_member" on public.workspace_documents;
create policy "workspace_documents_select_member"
  on public.workspace_documents for select to authenticated
  using (public.is_org_member(organization_id));

-- No public/anon policies: inserts/updates/deletes are service-role (admin) only for Phase 2.
