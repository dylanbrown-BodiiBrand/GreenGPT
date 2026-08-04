-- Phase 3: managed workflows — inspection prep, briefings, audit trail, write policies

create or replace function public.is_org_editor(org uuid)
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
      and m.role in ('owner', 'admin', 'editor')
      and (
        m.user_id = auth.uid()
        or lower(m.email) = lower(coalesce(auth.jwt()->>'email', ''))
      )
  );
$$;

revoke all on function public.is_org_editor(uuid) from public;
grant execute on function public.is_org_editor(uuid) to authenticated;

create table if not exists public.inspection_preps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  title text not null,
  inspection_type text not null default 'facility'
    check (inspection_type in ('facility', 'regulatory', 'internal')),
  scheduled_for date,
  checklist jsonb not null default '[]'::jsonb,
  summary text,
  review_state text not null default 'draft'
    check (review_state in ('draft', 'reviewed', 'approved', 'needs_clarification', 'archived')),
  created_by_email text,
  reviewer_name text,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspection_preps_org_idx on public.inspection_preps (organization_id);
create index if not exists inspection_preps_facility_idx on public.inspection_preps (facility_id);

create table if not exists public.compliance_briefings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  period_label text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  review_state text not null default 'draft'
    check (review_state in ('draft', 'reviewed', 'approved', 'needs_clarification', 'archived')),
  created_by_email text,
  reviewer_name text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compliance_briefings_org_idx on public.compliance_briefings (organization_id);

create table if not exists public.workspace_audit_events (
  id bigserial primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid,
  actor_email text not null,
  entity_type text not null,
  entity_id text,
  action text not null,
  from_state text,
  to_state text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_audit_events_org_idx
  on public.workspace_audit_events (organization_id, created_at desc);

alter table public.inspection_preps enable row level security;
alter table public.compliance_briefings enable row level security;
alter table public.workspace_audit_events enable row level security;

-- Select for members
drop policy if exists "inspection_preps_select_member" on public.inspection_preps;
create policy "inspection_preps_select_member"
  on public.inspection_preps for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "compliance_briefings_select_member" on public.compliance_briefings;
create policy "compliance_briefings_select_member"
  on public.compliance_briefings for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "workspace_audit_select_member" on public.workspace_audit_events;
create policy "workspace_audit_select_member"
  on public.workspace_audit_events for select to authenticated
  using (public.is_org_member(organization_id));

-- Write policies for editors
drop policy if exists "corrective_actions_insert_editor" on public.corrective_actions;
create policy "corrective_actions_insert_editor"
  on public.corrective_actions for insert to authenticated
  with check (public.is_org_editor(organization_id));

drop policy if exists "corrective_actions_update_editor" on public.corrective_actions;
create policy "corrective_actions_update_editor"
  on public.corrective_actions for update to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "evidence_items_insert_editor" on public.evidence_items;
create policy "evidence_items_insert_editor"
  on public.evidence_items for insert to authenticated
  with check (public.is_org_editor(organization_id));

drop policy if exists "evidence_items_update_editor" on public.evidence_items;
create policy "evidence_items_update_editor"
  on public.evidence_items for update to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "obligations_update_editor" on public.obligations;
create policy "obligations_update_editor"
  on public.obligations for update to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "inspection_preps_insert_editor" on public.inspection_preps;
create policy "inspection_preps_insert_editor"
  on public.inspection_preps for insert to authenticated
  with check (public.is_org_editor(organization_id));

drop policy if exists "inspection_preps_update_editor" on public.inspection_preps;
create policy "inspection_preps_update_editor"
  on public.inspection_preps for update to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "compliance_briefings_insert_editor" on public.compliance_briefings;
create policy "compliance_briefings_insert_editor"
  on public.compliance_briefings for insert to authenticated
  with check (public.is_org_editor(organization_id));

drop policy if exists "compliance_briefings_update_editor" on public.compliance_briefings;
create policy "compliance_briefings_update_editor"
  on public.compliance_briefings for update to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "workspace_audit_insert_member" on public.workspace_audit_events;
create policy "workspace_audit_insert_member"
  on public.workspace_audit_events for insert to authenticated
  with check (public.is_org_member(organization_id));
