import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultInspectionChecklist } from "../briefingBuilder";
import type { CorrectiveActionRow, EvidenceItemRow, ObligationRow } from "../types";
import {
  assertCanStartRun,
  assertCanUseTool,
  assertHumanCanApprove,
  assertPayloadNotConsequentialWrite,
  deny,
  forceDraftPayload,
} from "./authorization";
import { normalizeSources } from "./ledger";
import {
  decideProposalRow,
  getActiveAgent,
  insertActionEvent,
  insertProposal,
  insertRun,
  listPendingDedupeKeys,
  updateRunStatus,
} from "./persist";
import { capabilityForTool, planTool, type ToolName } from "./tools";
import type { AgentPrincipal, AgentProposal, AuthzResult, HumanPrincipal } from "./types";
import { MAX_PROPOSALS_PER_RUN } from "./types";

const RUN_TOOLS: ToolName[] = ["identify_deadlines", "propose_tasks", "prepare_records"];

export async function loadToolContext(
  supabase: SupabaseClient,
  organizationId: string,
  organizationName: string,
  facilityId: string | null,
  facilityName: string | null
) {
  let obligationsQuery = supabase
    .from("obligations")
    .select(
      "id, organization_id, facility_id, title, source_document, source_citation, jurisdiction, frequency, owner_name, evidence_required, status, review_state, next_due_at, notes"
    )
    .eq("organization_id", organizationId)
    .limit(50);
  if (facilityId) obligationsQuery = obligationsQuery.eq("facility_id", facilityId);

  let actionsQuery = supabase
    .from("corrective_actions")
    .select(
      "id, organization_id, facility_id, finding, description, owner_name, due_date, priority, evidence_required, evidence_link, status, reviewer_name, notes"
    )
    .eq("organization_id", organizationId)
    .neq("status", "closed")
    .limit(50);
  if (facilityId) actionsQuery = actionsQuery.eq("facility_id", facilityId);

  let evidenceQuery = supabase
    .from("evidence_items")
    .select("id, organization_id, facility_id, title, required_proof, status, last_reviewed_at, notes")
    .eq("organization_id", organizationId)
    .eq("status", "missing")
    .limit(50);
  if (facilityId) evidenceQuery = evidenceQuery.eq("facility_id", facilityId);

  const [{ data: obligations }, { data: actions }, { data: evidence }] = await Promise.all([
    obligationsQuery,
    actionsQuery,
    evidenceQuery,
  ]);

  return {
    organizationId,
    organizationName,
    facilityId,
    facilityName,
    obligations: (obligations ?? []) as ObligationRow[],
    actions: (actions ?? []) as CorrectiveActionRow[],
    evidence: (evidence ?? []) as EvidenceItemRow[],
  };
}

export async function executeAgentRun(input: {
  supabase: SupabaseClient;
  human: HumanPrincipal;
  organizationId: string;
  organizationName: string;
  facilityId: string | null;
  facilityName: string | null;
  trigger: string;
  tools?: ToolName[];
  agent?: AgentPrincipal | null;
}): Promise<{ result: AuthzResult; runId?: string; proposalCount?: number }> {
  const agent = input.agent ?? (await getActiveAgent(input.supabase, input.organizationId));
  const start = assertCanStartRun({
    actor: input.human,
    agent,
    organizationId: input.organizationId,
    facilityId: input.facilityId,
  });
  if (!start.ok) return { result: start };
  const liveAgent = agent as AgentPrincipal;

  const run = await insertRun(input.supabase, {
    organizationId: input.organizationId,
    agentId: liveAgent.id,
    facilityId: input.facilityId,
    trigger: input.trigger,
    human: input.human,
  });

  const ctx = await loadToolContext(
    input.supabase,
    input.organizationId,
    input.organizationName,
    input.facilityId,
    input.facilityName
  );
  const pendingKeys = await listPendingDedupeKeys(input.supabase, input.organizationId);
  const tools = input.tools?.length ? input.tools : RUN_TOOLS;
  let created = 0;

  for (const tool of tools) {
    const capability = capabilityForTool(tool);
    if (capability) {
      const allowed = assertCanUseTool({
        agent: liveAgent,
        capability,
        organizationId: input.organizationId,
        facilityId: input.facilityId,
      });
      if (!allowed.ok) {
        await updateRunStatus(input.supabase, run.id, "failed");
        return { result: allowed, runId: run.id };
      }
    }

    const planned = planTool(tool, {
      ...ctx,
      pendingDedupeKeys: pendingKeys,
      now: new Date().toISOString(),
    });

    for (const item of planned) {
      if (created >= MAX_PROPOSALS_PER_RUN) break;
      const payloadCheck = assertPayloadNotConsequentialWrite(item.payload);
      if (!payloadCheck.ok) continue;
      if (pendingKeys.includes(item.dedupeKey)) continue;
      try {
        const proposal = await insertProposal(input.supabase, {
          organizationId: input.organizationId,
          facilityId: item.facilityId,
          agentId: liveAgent.id,
          runId: run.id,
          kind: item.kind,
          status: "pending",
          dedupeKey: item.dedupeKey,
          payload: forceDraftPayload(item.payload),
          proposedChange: item.proposedChange,
          supportingSources: normalizeSources(item.supportingSources),
        });
        pendingKeys.push(item.dedupeKey);
        created += 1;
        await insertActionEvent(input.supabase, {
          organizationId: input.organizationId,
          runId: run.id,
          agentId: liveAgent.id,
          proposalId: proposal.id,
          toolName: item.toolName,
          inputs: { kind: item.kind, facilityId: item.facilityId },
          supportingSources: proposal.supportingSources,
          proposedChange: proposal.proposedChange,
          approvalStatus: "pending",
          authorizedByUserId: null,
          authorizedByEmail: null,
          appliedEntityType: null,
          appliedEntityIds: [],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("agent_proposals_pending_dedupe_idx") || message.toLowerCase().includes("duplicate")) {
          return { result: deny("DUPLICATE_PROPOSAL", "A pending proposal already exists for this finding and facility."), runId: run.id };
        }
        throw err;
      }
    }
  }

  await updateRunStatus(input.supabase, run.id, created ? "awaiting_approval" : "completed");
  return { result: { ok: true }, runId: run.id, proposalCount: created };
}

export async function applyApprovedProposal(input: {
  supabase: SupabaseClient;
  proposal: AgentProposal;
  human: HumanPrincipal;
}): Promise<{ entityType: string; entityIds: string[] }> {
  const payload = forceDraftPayload(input.proposal.payload);
  const facilityId =
    (typeof payload.facilityId === "string" && payload.facilityId) || input.proposal.facilityId;

  if (input.proposal.kind === "corrective_action") {
    const { data, error } = await input.supabase
      .from("corrective_actions")
      .insert({
        organization_id: input.proposal.organizationId,
        facility_id: facilityId,
        finding: String(payload.finding ?? "Agent-proposed action"),
        description: typeof payload.description === "string" ? payload.description : null,
        owner_name: typeof payload.ownerName === "string" ? payload.ownerName : null,
        due_date: typeof payload.dueDate === "string" && payload.dueDate ? payload.dueDate : null,
        priority: typeof payload.priority === "string" ? payload.priority : "medium",
        evidence_required: typeof payload.evidenceRequired === "string" ? payload.evidenceRequired : null,
        source_references: typeof payload.sourceReferences === "string" ? payload.sourceReferences : null,
        notes: "Created from an approved agent proposal. Draft until EHS review.",
        status: "open",
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("Unable to apply corrective action proposal.");
    return { entityType: "corrective_action", entityIds: [data.id as string] };
  }

  if (input.proposal.kind === "inspection_prep") {
    const checklist = Array.isArray(payload.checklist) ? payload.checklist : defaultInspectionChecklist();
    const { data, error } = await input.supabase
      .from("inspection_preps")
      .insert({
        organization_id: input.proposal.organizationId,
        facility_id: facilityId,
        title: String(payload.title ?? "Inspection prep"),
        inspection_type: typeof payload.inspectionType === "string" ? payload.inspectionType : "facility",
        summary: typeof payload.summary === "string" ? payload.summary : null,
        checklist,
        review_state: "draft",
        created_by_email: input.human.email,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("Unable to apply inspection prep proposal.");
    return { entityType: "inspection_prep", entityIds: [data.id as string] };
  }

  if (input.proposal.kind === "briefing") {
    const { data, error } = await input.supabase
      .from("compliance_briefings")
      .insert({
        organization_id: input.proposal.organizationId,
        facility_id: facilityId,
        period_label: String(payload.periodLabel ?? "Draft period"),
        title: String(payload.title ?? "Compliance briefing"),
        content: payload.content ?? {},
        review_state: "draft",
        created_by_email: input.human.email,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("Unable to apply briefing proposal.");
    return { entityType: "compliance_briefing", entityIds: [data.id as string] };
  }

  return { entityType: "deadline_alert", entityIds: [] };
}

export async function decideAndApply(input: {
  supabase: SupabaseClient;
  proposal: AgentProposal;
  agent: AgentPrincipal;
  human: HumanPrincipal;
  decision: "approved" | "denied";
}): Promise<AuthzResult> {
  const authz = assertHumanCanApprove({
    human: input.human,
    agent: input.agent,
    proposal: input.proposal,
  });
  if (!authz.ok) return authz;
  const payloadCheck = assertPayloadNotConsequentialWrite(input.proposal.payload);
  if (!payloadCheck.ok) return payloadCheck;

  await decideProposalRow(input.supabase, input.proposal, input.human, input.decision);

  if (input.decision === "denied") {
    await insertActionEvent(input.supabase, {
      organizationId: input.proposal.organizationId,
      runId: input.proposal.runId,
      agentId: input.proposal.agentId,
      proposalId: input.proposal.id,
      toolName: "request_approval",
      inputs: { decision: "denied" },
      supportingSources: input.proposal.supportingSources,
      proposedChange: input.proposal.proposedChange,
      approvalStatus: "denied",
      authorizedByUserId: input.human.userId,
      authorizedByEmail: input.human.email,
      appliedEntityType: null,
      appliedEntityIds: [],
    });
    return { ok: true };
  }

  const applied = await applyApprovedProposal({
    supabase: input.supabase,
    proposal: input.proposal,
    human: input.human,
  });
  await insertActionEvent(input.supabase, {
    organizationId: input.proposal.organizationId,
    runId: input.proposal.runId,
    agentId: input.proposal.agentId,
    proposalId: input.proposal.id,
    toolName: "request_approval",
    inputs: { decision: "approved" },
    supportingSources: input.proposal.supportingSources,
    proposedChange: input.proposal.proposedChange,
    approvalStatus: "approved",
    authorizedByUserId: input.human.userId,
    authorizedByEmail: input.human.email,
    appliedEntityType: applied.entityType,
    appliedEntityIds: applied.entityIds,
  });
  return { ok: true };
}
