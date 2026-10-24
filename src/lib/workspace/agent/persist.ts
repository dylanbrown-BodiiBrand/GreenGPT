import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AGENT_NAME, DEFAULT_CAPABILITIES } from "./types";
import { normalizeSources, validateActionEventCompleteness } from "./ledger";
import type {
  AgentActionEvent,
  AgentCapability,
  AgentPrincipal,
  AgentProposal,
  AgentRun,
  ApprovalStatus,
  HumanPrincipal,
  ProposalKind,
  SupportingSource,
} from "./types";

type AgentRow = {
  id: string;
  organization_id: string;
  name: string;
  status: AgentPrincipal["status"];
  delegated_by_user_id: string | null;
  delegated_by_email: string | null;
  facility_ids: string[] | null;
  capabilities: string[] | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  revoke_reason: string | null;
};

type RunRow = {
  id: string;
  organization_id: string;
  agent_id: string;
  facility_id: string | null;
  trigger: string;
  status: AgentRun["status"];
  started_by_user_id: string | null;
  started_by_email: string | null;
  created_at: string;
};

type ProposalRow = {
  id: string;
  organization_id: string;
  facility_id: string | null;
  agent_id: string;
  run_id: string;
  kind: ProposalKind;
  status: ApprovalStatus;
  dedupe_key: string;
  payload: Record<string, unknown>;
  proposed_change: AgentProposal["proposedChange"];
  supporting_sources: SupportingSource[];
  authorized_by_user_id: string | null;
  authorized_by_email: string | null;
  decided_at: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  organization_id: string;
  run_id: string | null;
  agent_id: string;
  proposal_id: string | null;
  tool_name: string;
  inputs: Record<string, unknown>;
  supporting_sources: SupportingSource[];
  proposed_change: AgentActionEvent["proposedChange"];
  approval_status: ApprovalStatus;
  authorized_by_user_id: string | null;
  authorized_by_email: string | null;
  applied_entity_type: string | null;
  applied_entity_ids: string[] | null;
  created_at: string;
};

export function mapAgent(row: AgentRow): AgentPrincipal {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    status: row.status,
    delegatedByUserId: row.delegated_by_user_id,
    delegatedByEmail: row.delegated_by_email,
    facilityIds: row.facility_ids,
    capabilities: (row.capabilities ?? DEFAULT_CAPABILITIES) as AgentCapability[],
    revokedAt: row.revoked_at,
    revokedByUserId: row.revoked_by_user_id,
    revokeReason: row.revoke_reason,
  };
}

export function mapRun(row: RunRow): AgentRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    agentId: row.agent_id,
    facilityId: row.facility_id,
    trigger: row.trigger,
    status: row.status,
    startedByUserId: row.started_by_user_id,
    startedByEmail: row.started_by_email,
    createdAt: row.created_at,
  };
}

export function mapProposal(row: ProposalRow): AgentProposal {
  return {
    id: row.id,
    organizationId: row.organization_id,
    facilityId: row.facility_id,
    agentId: row.agent_id,
    runId: row.run_id,
    kind: row.kind,
    status: row.status,
    dedupeKey: row.dedupe_key,
    payload: row.payload ?? {},
    proposedChange: row.proposed_change ?? { before: null, after: null },
    supportingSources: Array.isArray(row.supporting_sources) ? row.supporting_sources : [],
    authorizedByUserId: row.authorized_by_user_id,
    authorizedByEmail: row.authorized_by_email,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export function mapEvent(row: EventRow): AgentActionEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    runId: row.run_id,
    agentId: row.agent_id,
    proposalId: row.proposal_id,
    toolName: row.tool_name,
    inputs: row.inputs ?? {},
    supportingSources: Array.isArray(row.supporting_sources) ? row.supporting_sources : [],
    proposedChange: row.proposed_change,
    approvalStatus: row.approval_status,
    authorizedByUserId: row.authorized_by_user_id,
    authorizedByEmail: row.authorized_by_email,
    appliedEntityType: row.applied_entity_type,
    appliedEntityIds: row.applied_entity_ids ?? [],
    createdAt: row.created_at,
  };
}

export async function listAgents(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AgentPrincipal[]> {
  const { data, error } = await supabase
    .from("workspace_agents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as AgentRow[]).map(mapAgent);
}

export async function getAgent(
  supabase: SupabaseClient,
  agentId: string
): Promise<AgentPrincipal | null> {
  const { data, error } = await supabase
    .from("workspace_agents")
    .select("*")
    .eq("id", agentId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAgent(data as AgentRow) : null;
}

export async function getActiveAgent(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AgentPrincipal | null> {
  const { data, error } = await supabase
    .from("workspace_agents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapAgent(data as AgentRow) : null;
}

export async function insertAgent(
  supabase: SupabaseClient,
  human: HumanPrincipal,
  organizationId: string,
  input?: { name?: string; facilityIds?: string[] | null; capabilities?: AgentCapability[] }
): Promise<AgentPrincipal> {
  const { data, error } = await supabase
    .from("workspace_agents")
    .insert({
      organization_id: organizationId,
      name: input?.name || DEFAULT_AGENT_NAME,
      status: "active",
      delegated_by_user_id: human.userId,
      delegated_by_email: human.email,
      facility_ids: input?.facilityIds ?? null,
      capabilities: [...(input?.capabilities ?? DEFAULT_CAPABILITIES)],
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapAgent(data as AgentRow);
}

export async function revokeAgentRow(
  supabase: SupabaseClient,
  agent: AgentPrincipal,
  human: HumanPrincipal,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from("workspace_agents")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by_user_id: human.userId,
      revoke_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agent.id);
  if (error) throw error;

  await supabase
    .from("agent_runs")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("agent_id", agent.id)
    .in("status", ["running", "awaiting_approval"]);
}

export async function insertRun(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    agentId: string;
    facilityId: string | null;
    trigger: string;
    human: HumanPrincipal;
  }
): Promise<AgentRun> {
  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      organization_id: input.organizationId,
      agent_id: input.agentId,
      facility_id: input.facilityId,
      trigger: input.trigger,
      status: "running",
      started_by_user_id: input.human.userId,
      started_by_email: input.human.email,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRun(data as RunRow);
}

export async function updateRunStatus(
  supabase: SupabaseClient,
  runId: string,
  status: AgentRun["status"]
): Promise<void> {
  const { error } = await supabase
    .from("agent_runs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw error;
}

export async function insertProposal(
  supabase: SupabaseClient,
  proposal: Omit<AgentProposal, "id" | "createdAt" | "authorizedByUserId" | "authorizedByEmail" | "decidedAt">
): Promise<AgentProposal> {
  const { data, error } = await supabase
    .from("agent_proposals")
    .insert({
      organization_id: proposal.organizationId,
      facility_id: proposal.facilityId,
      agent_id: proposal.agentId,
      run_id: proposal.runId,
      kind: proposal.kind,
      status: proposal.status,
      dedupe_key: proposal.dedupeKey,
      payload: proposal.payload,
      proposed_change: proposal.proposedChange,
      supporting_sources: proposal.supportingSources,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapProposal(data as ProposalRow);
}

export async function getProposal(
  supabase: SupabaseClient,
  proposalId: string
): Promise<AgentProposal | null> {
  const { data, error } = await supabase
    .from("agent_proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapProposal(data as ProposalRow) : null;
}

export async function listPendingProposals(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AgentProposal[]> {
  const { data, error } = await supabase
    .from("agent_proposals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as ProposalRow[]).map(mapProposal);
}

export async function listPendingDedupeKeys(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("agent_proposals")
    .select("dedupe_key")
    .eq("organization_id", organizationId)
    .eq("status", "pending");
  if (error) throw error;
  return ((data ?? []) as { dedupe_key: string }[]).map((r) => r.dedupe_key);
}

export async function decideProposalRow(
  supabase: SupabaseClient,
  proposal: AgentProposal,
  human: HumanPrincipal,
  decision: Extract<ApprovalStatus, "approved" | "denied">
): Promise<void> {
  const { error } = await supabase
    .from("agent_proposals")
    .update({
      status: decision,
      authorized_by_user_id: human.userId,
      authorized_by_email: human.email,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposal.id)
    .eq("status", "pending");
  if (error) throw error;
}

export async function insertActionEvent(
  supabase: SupabaseClient,
  event: Omit<AgentActionEvent, "id" | "createdAt">
): Promise<void> {
  const supportingSources = normalizeSources(event.supportingSources);
  const complete = validateActionEventCompleteness({
    toolName: event.toolName,
    supportingSources,
  });
  if (!complete.ok) {
    console.warn("[agent.ledger]", complete.message);
    return;
  }
  const { error } = await supabase.from("agent_action_events").insert({
    organization_id: event.organizationId,
    run_id: event.runId,
    agent_id: event.agentId,
    proposal_id: event.proposalId,
    tool_name: event.toolName,
    inputs: event.inputs,
    supporting_sources: supportingSources,
    proposed_change: event.proposedChange,
    approval_status: event.approvalStatus,
    authorized_by_user_id: event.authorizedByUserId,
    authorized_by_email: event.authorizedByEmail,
    applied_entity_type: event.appliedEntityType,
    applied_entity_ids: event.appliedEntityIds,
  });
  if (error) {
    console.warn("[agent.ledger] failed to write action event:", error.message);
  }
}

export async function listActionEvents(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 100
): Promise<AgentActionEvent[]> {
  const { data, error } = await supabase
    .from("agent_action_events")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as EventRow[]).map(mapEvent);
}
