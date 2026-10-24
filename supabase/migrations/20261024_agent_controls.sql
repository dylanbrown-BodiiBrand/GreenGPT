-- Industrial compliance agent controls (identity, grants, ledger, proposals)
-- Spec: docs/controls/industrial-compliance-agent.md v1.0.0

alter table public.documents
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists facility_id uuid references public.facilities(id) on delete set null;

create index if not exists documents_org_idx on public.documents (organization_id);
create index if not exists documents_facility_idx on public.documents (facility_id);

create table if not exists public.workspace_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'revoked')),
  delegated_by_user_id uuid,
  delegated_by_email text,
  facility_ids uuid[] ,
  capabilities text[] not null default array['identify_deadlines','propose_tasks','prepare_records','request_approval']::text[],
  revoked_at timestamptz,
  revoked_by_user_id uuid,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_agents_org_idx on public.workspace_agents (organization_id);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.workspace_agents(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  trigger text not null,
  status text not null default 'running'
    check (status in ('running', 'awaiting_approval', 'completed', 'cancelled', 'failed')),
  started_by_user_id uuid,
  started_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_runs_org_idx on public.agent_runs (organization_id, created_at desc);

create table if not exists public.agent_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  agent_id uuid not null references public.workspace_agents(id) on delete cascade,
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  kind text not null
    check (kind in ('corrective_action', 'inspection_prep', 'briefing', 'deadline_alert')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'expired', 'not_required')),
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  proposed_change jsonb not null default '{}'::jsonb,
  supporting_sources jsonb not null default '[]'::jsonb,
  authorized_by_user_id uuid,
  authorized_by_email text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agent_proposals_pending_dedupe_idx
  on public.agent_proposals (organization_id, dedupe_key)
  where status = 'pending';

create index if not exists agent_proposals_org_idx on public.agent_proposals (organization_id, created_at desc);

create table if not exists public.agent_action_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  agent_id uuid not null references public.workspace_agents(id) on delete cascade,
  proposal_id uuid references public.agent_proposals(id) on delete set null,
  tool_name text not null,
  inputs jsonb not null default '{}'::jsonb,
  supporting_sources jsonb not null default '[]'::jsonb,
  proposed_change jsonb,
  approval_status text not null
    check (approval_status in ('pending', 'approved', 'denied', 'expired', 'not_required')),
  authorized_by_user_id uuid,
  authorized_by_email text,
  applied_entity_type text,
  applied_entity_ids text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);

create index if not exists agent_action_events_org_idx
  on public.agent_action_events (organization_id, created_at desc);

alter table public.workspace_agents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_proposals enable row level security;
alter table public.agent_action_events enable row level security;

drop policy if exists "workspace_agents_select_member" on public.workspace_agents;
create policy "workspace_agents_select_member"
  on public.workspace_agents for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "workspace_agents_write_editor" on public.workspace_agents;
create policy "workspace_agents_write_editor"
  on public.workspace_agents for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "agent_runs_select_member" on public.agent_runs;
create policy "agent_runs_select_member"
  on public.agent_runs for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "agent_runs_write_editor" on public.agent_runs;
create policy "agent_runs_write_editor"
  on public.agent_runs for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "agent_proposals_select_member" on public.agent_proposals;
create policy "agent_proposals_select_member"
  on public.agent_proposals for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "agent_proposals_write_editor" on public.agent_proposals;
create policy "agent_proposals_write_editor"
  on public.agent_proposals for all to authenticated
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

drop policy if exists "agent_action_events_select_member" on public.agent_action_events;
create policy "agent_action_events_select_member"
  on public.agent_action_events for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists "agent_action_events_insert_member" on public.agent_action_events;
create policy "agent_action_events_insert_member"
  on public.agent_action_events for insert to authenticated
  with check (public.is_org_member(organization_id));

-- Append-only: no update/delete policies for agent_action_events.
