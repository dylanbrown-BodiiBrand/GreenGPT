-- Register population from a human-completed ARDR (spec v1.1.0, ICA-13–ICA-16)

alter table public.agent_proposals drop constraint if exists agent_proposals_kind_check;
alter table public.agent_proposals
  add constraint agent_proposals_kind_check
  check (kind in ('corrective_action', 'inspection_prep', 'briefing', 'deadline_alert', 'obligation'));

-- New agents receive populate_register by default. Existing agents keep their delegated grants;
-- an EHS manager provisions a new agent to delegate register population.
alter table public.workspace_agents
  alter column capabilities
  set default array['identify_deadlines','propose_tasks','prepare_records','populate_register','request_approval']::text[];

-- Approved obligation proposals are applied by the approving editor's session.
drop policy if exists "obligations_insert_editor" on public.obligations;
create policy "obligations_insert_editor"
  on public.obligations for insert to authenticated
  with check (public.is_org_editor(organization_id));
