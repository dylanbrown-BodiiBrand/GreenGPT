import { canActAtFacility } from "../roles";
import {
  assertAgentCannotApprove,
  assertCanManageAgent,
  assertCanRevoke,
  assertCanStartRun,
  assertCanUseTool,
  assertHumanCanApprove,
  assertPayloadNotConsequentialWrite,
  assertProposalGrounded,
  deny,
  forceDraftPayload,
} from "./authorization";
import { normalizeSources, validateActionEventCompleteness } from "./ledger";
import { capabilityForTool, planTool, proposalCapForTool, type ToolContext, type ToolName } from "./tools";
import type {
  AgentActionEvent,
  AgentPrincipal,
  AgentProposal,
  AgentRun,
  AppliedEntity,
  ApprovalStatus,
  AuthzResult,
  HumanPrincipal,
  TriggerActor,
} from "./types";
import { DEFAULT_AGENT_NAME, DEFAULT_CAPABILITIES } from "./types";

export type PlaneClock = {
  now: () => string;
  id: () => string;
};

function defaultClock(): PlaneClock {
  let n = 0;
  return {
    now: () => new Date().toISOString(),
    id: () => {
      n += 1;
      return `id-${n.toString().padStart(8, "0")}`;
    },
  };
}

export class AgentControlPlane {
  agents = new Map<string, AgentPrincipal>();
  runs = new Map<string, AgentRun>();
  proposals = new Map<string, AgentProposal>();
  events: AgentActionEvent[] = [];
  entities: AppliedEntity[] = [];

  constructor(private readonly clock: PlaneClock = defaultClock()) {}

  provisionDefaultAgent(input: {
    organizationId: string;
    human: HumanPrincipal;
    facilityIds?: string[] | null;
  }): { result: AuthzResult; agent?: AgentPrincipal } {
    const authz = assertCanManageAgent(input.human, input.organizationId);
    if (!authz.ok) return { result: authz };
    const agent: AgentPrincipal = {
      id: this.clock.id(),
      organizationId: input.organizationId,
      name: DEFAULT_AGENT_NAME,
      status: "active",
      delegatedByUserId: input.human.userId,
      delegatedByEmail: input.human.email,
      facilityIds: input.facilityIds ?? null,
      capabilities: [...DEFAULT_CAPABILITIES],
      revokedAt: null,
      revokedByUserId: null,
      revokeReason: null,
    };
    this.agents.set(agent.id, agent);
    this.appendEvent({
      organizationId: agent.organizationId,
      runId: null,
      agentId: agent.id,
      proposalId: null,
      toolName: "provision_agent",
      inputs: { name: agent.name },
      supportingSources: [{ filename: "Control specification", excerpt: "EHS manager delegated a named agent." }],
      proposedChange: { before: null, after: { status: "active" } },
      approvalStatus: "not_required",
      authorizedByUserId: input.human.userId,
      authorizedByEmail: input.human.email,
      appliedEntityType: "workspace_agent",
      appliedEntityIds: [agent.id],
    });
    return { result: { ok: true }, agent };
  }

  revokeAgent(human: HumanPrincipal, agentId: string, reason: string): AuthzResult {
    const agent = this.agents.get(agentId) ?? null;
    if (!agent) return deny("AGENT_NOT_FOUND", "Agent identity was not found.");
    const authz = assertCanRevoke(human, agent);
    if (!authz.ok) return authz;
    const next: AgentPrincipal = {
      ...agent,
      status: "revoked",
      revokedAt: this.clock.now(),
      revokedByUserId: human.userId,
      revokeReason: reason,
    };
    this.agents.set(agent.id, next);
    for (const run of this.runs.values()) {
      if (run.agentId === agent.id && (run.status === "running" || run.status === "awaiting_approval")) {
        this.runs.set(run.id, { ...run, status: "cancelled" });
      }
    }
    this.appendEvent({
      organizationId: agent.organizationId,
      runId: null,
      agentId: agent.id,
      proposalId: null,
      toolName: "revoke_agent",
      inputs: { reason },
      supportingSources: [{ filename: "Revocation record", excerpt: reason }],
      proposedChange: { before: { status: agent.status }, after: { status: "revoked" } },
      approvalStatus: "not_required",
      authorizedByUserId: human.userId,
      authorizedByEmail: human.email,
      appliedEntityType: "workspace_agent",
      appliedEntityIds: [agent.id],
    });
    return { ok: true };
  }

  startRun(input: {
    actor: TriggerActor;
    agentId: string;
    organizationId: string;
    facilityId: string | null;
    trigger: string;
  }): { result: AuthzResult; run?: AgentRun } {
    const agent = this.agents.get(input.agentId) ?? null;
    const authz = assertCanStartRun({
      actor: input.actor,
      agent,
      organizationId: input.organizationId,
      facilityId: input.facilityId,
    });
    if (!authz.ok) return { result: authz };
    const startedBy = input.actor.kind === "human" ? input.actor : null;
    const run: AgentRun = {
      id: this.clock.id(),
      organizationId: input.organizationId,
      agentId: input.agentId,
      facilityId: input.facilityId,
      trigger: input.trigger,
      status: "running",
      startedByUserId: startedBy?.userId ?? null,
      startedByEmail: startedBy?.email ?? null,
      createdAt: this.clock.now(),
    };
    this.runs.set(run.id, run);
    return { result: { ok: true }, run };
  }

  executeTool(input: {
    runId: string;
    tool: ToolName;
    context: Omit<ToolContext, "pendingDedupeKeys" | "now">;
  }): { result: AuthzResult; proposals: AgentProposal[] } {
    const run = this.runs.get(input.runId);
    if (!run) return { result: deny("RUN_NOT_FOUND", "Agent run was not found."), proposals: [] };
    const agent = this.agents.get(run.agentId);
    if (!agent) return { result: deny("AGENT_NOT_FOUND", "Agent identity was not found."), proposals: [] };
    if (run.status === "cancelled") {
      return { result: deny("RUN_CANCELLED", "This run was cancelled."), proposals: [] };
    }

    if (input.context.organizationId !== run.organizationId || agent.organizationId !== run.organizationId) {
      return { result: deny("CROSS_ORG", "Agent cannot act in another organization."), proposals: [] };
    }

    const capability = capabilityForTool(input.tool);
    if (capability) {
      const authz = assertCanUseTool({
        agent,
        capability,
        organizationId: run.organizationId,
        facilityId: run.facilityId,
      });
      if (!authz.ok) return { result: authz, proposals: [] };
    } else {
      const start = assertCanStartRun({
        actor: {
          kind: "human",
          userId: run.startedByUserId ?? "unknown",
          email: run.startedByEmail ?? "",
          organizationId: run.organizationId,
          orgRole: "editor",
          jobFunction: "facility_admin",
          facilityIds: null,
        },
        agent,
        organizationId: run.organizationId,
        facilityId: run.facilityId,
      });
      if (!start.ok) return { result: start, proposals: [] };
    }

    const pendingDedupeKeys = [...this.proposals.values()]
      .filter((p) => p.status === "pending" && p.organizationId === run.organizationId)
      .map((p) => p.dedupeKey);

    const scopedContext = {
      ...input.context,
      organizationId: run.organizationId,
      facilityId: run.facilityId,
      obligations: input.context.obligations.filter(
        (row) =>
          row.organization_id === run.organizationId &&
          (!run.facilityId || row.facility_id === run.facilityId)
      ),
      actions: input.context.actions.filter(
        (row) =>
          row.organization_id === run.organizationId &&
          (!run.facilityId || row.facility_id === run.facilityId)
      ),
      evidence: input.context.evidence.filter(
        (row) =>
          row.organization_id === run.organizationId &&
          (!run.facilityId || row.facility_id === run.facilityId)
      ),
    };

    const planned = planTool(input.tool, {
      ...scopedContext,
      pendingDedupeKeys,
      now: this.clock.now(),
    });

    const created: AgentProposal[] = [];
    for (const item of planned) {
      if (created.length >= proposalCapForTool(input.tool)) break;
      if (run.facilityId && item.facilityId && item.facilityId !== run.facilityId) {
        return { result: deny("FACILITY_SCOPE", "Agent is not authorized for this facility."), proposals: created };
      }
      if (item.facilityId && !canActAtFacility(agent.facilityIds, item.facilityId)) {
        return { result: deny("FACILITY_SCOPE", "Agent is not authorized for this facility."), proposals: created };
      }
      const payloadCheck = assertPayloadNotConsequentialWrite(item.payload);
      if (!payloadCheck.ok) return { result: payloadCheck, proposals: created };
      const grounded = assertProposalGrounded(item.kind, item.payload, item.supportingSources);
      if (!grounded.ok) return { result: grounded, proposals: created };
      if (pendingDedupeKeys.includes(item.dedupeKey) || created.some((p) => p.dedupeKey === item.dedupeKey)) {
        return { result: deny("DUPLICATE_PROPOSAL", "A pending proposal already exists for this finding and facility."), proposals: created };
      }
      const proposal: AgentProposal = {
        id: this.clock.id(),
        organizationId: run.organizationId,
        facilityId: item.facilityId,
        agentId: agent.id,
        runId: run.id,
        kind: item.kind,
        status: "pending",
        dedupeKey: item.dedupeKey,
        payload: item.payload,
        proposedChange: item.proposedChange,
        supportingSources: normalizeSources(item.supportingSources),
        authorizedByUserId: null,
        authorizedByEmail: null,
        decidedAt: null,
        createdAt: this.clock.now(),
      };
      this.proposals.set(proposal.id, proposal);
      created.push(proposal);
      pendingDedupeKeys.push(proposal.dedupeKey);
      this.appendEvent({
        organizationId: run.organizationId,
        runId: run.id,
        agentId: agent.id,
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
    }

    this.runs.set(run.id, {
      ...run,
      status: created.length ? "awaiting_approval" : "completed",
    });
    return { result: { ok: true }, proposals: created };
  }

  createProposal(input: {
    agentId: string;
    runId: string;
    organizationId: string;
    facilityId: string | null;
    kind: AgentProposal["kind"];
    dedupeKey: string;
    payload: Record<string, unknown>;
    supportingSources: AgentProposal["supportingSources"];
    toolName: string;
  }): { result: AuthzResult; proposal?: AgentProposal } {
    const agent = this.agents.get(input.agentId) ?? null;
    if (!agent) return { result: deny("AGENT_NOT_FOUND", "Agent identity was not found.") };
    const capability =
      input.kind === "corrective_action"
        ? "propose_tasks"
        : input.kind === "deadline_alert"
          ? "identify_deadlines"
          : input.kind === "obligation"
            ? "populate_register"
            : "prepare_records";
    const authz = assertCanUseTool({
      agent,
      capability,
      organizationId: input.organizationId,
      facilityId: input.facilityId,
    });
    if (!authz.ok) return { result: authz };
    const payloadCheck = assertPayloadNotConsequentialWrite(input.payload);
    if (!payloadCheck.ok) return { result: payloadCheck };
    const grounded = assertProposalGrounded(input.kind, input.payload, input.supportingSources);
    if (!grounded.ok) return { result: grounded };
    const duplicate = [...this.proposals.values()].some(
      (p) => p.status === "pending" && p.dedupeKey === input.dedupeKey && p.organizationId === input.organizationId
    );
    if (duplicate) {
      return {
        result: deny("DUPLICATE_PROPOSAL", "A pending proposal already exists for this finding and facility."),
      };
    }
    const proposal: AgentProposal = {
      id: this.clock.id(),
      organizationId: input.organizationId,
      facilityId: input.facilityId,
      agentId: agent.id,
      runId: input.runId,
      kind: input.kind,
      status: "pending",
      dedupeKey: input.dedupeKey,
      payload: forceDraftPayload(input.payload),
      proposedChange: { before: null, after: forceDraftPayload(input.payload) },
      supportingSources: normalizeSources(input.supportingSources),
      authorizedByUserId: null,
      authorizedByEmail: null,
      decidedAt: null,
      createdAt: this.clock.now(),
    };
    this.proposals.set(proposal.id, proposal);
    this.appendEvent({
      organizationId: input.organizationId,
      runId: input.runId,
      agentId: agent.id,
      proposalId: proposal.id,
      toolName: input.toolName,
      inputs: { kind: input.kind },
      supportingSources: proposal.supportingSources,
      proposedChange: proposal.proposedChange,
      approvalStatus: "pending",
      authorizedByUserId: null,
      authorizedByEmail: null,
      appliedEntityType: null,
      appliedEntityIds: [],
    });
    return { result: { ok: true }, proposal };
  }

  logAskRetrieval(input: {
    agent: AgentPrincipal;
    organizationId: string;
    facilityId: string | null;
    question: string;
    sources: AgentActionEvent["supportingSources"];
    answerDraft: string;
  }): AuthzResult {
    const authz = assertCanStartRun({
      actor: { kind: "human", userId: "ask", email: "ask", organizationId: input.organizationId, orgRole: "viewer", jobFunction: "employee", facilityIds: null },
      agent: input.agent,
      organizationId: input.organizationId,
      facilityId: input.facilityId,
    });
    if (!authz.ok) return authz;
    this.appendEvent({
      organizationId: input.organizationId,
      runId: null,
      agentId: input.agent.id,
      proposalId: null,
      toolName: "search_approved_corpus",
      inputs: { question: input.question, facilityId: input.facilityId },
      supportingSources: normalizeSources(input.sources),
      proposedChange: { before: null, after: { reviewStatus: "draft", answer: input.answerDraft.slice(0, 500) } },
      approvalStatus: "not_required",
      authorizedByUserId: null,
      authorizedByEmail: null,
      appliedEntityType: null,
      appliedEntityIds: [],
    });
    return { ok: true };
  }

  decideProposal(input: {
    proposalId: string;
    actor: TriggerActor;
    human?: HumanPrincipal;
    decision: Extract<ApprovalStatus, "approved" | "denied">;
  }): { result: AuthzResult; proposal?: AgentProposal; entity?: AppliedEntity } {
    const self = assertAgentCannotApprove(input.actor);
    if (!self.ok) return { result: self };
    if (!input.human || input.actor.kind !== "human") {
      return { result: deny("HUMAN_REQUIRED", "Only a human principal may approve a proposal.") };
    }
    const proposal = this.proposals.get(input.proposalId);
    if (!proposal) return { result: deny("PROPOSAL_NOT_FOUND", "Proposal was not found.") };
    if (proposal.status !== "pending") {
      return { result: deny("PROPOSAL_NOT_PENDING", "Proposal is not awaiting approval.") };
    }
    const agent = this.agents.get(proposal.agentId);
    if (!agent) return { result: deny("AGENT_NOT_FOUND", "Agent identity was not found.") };
    const authz = assertHumanCanApprove({ human: input.human, agent, proposal });
    if (!authz.ok) return { result: authz };

    const decided: AgentProposal = {
      ...proposal,
      status: input.decision,
      authorizedByUserId: input.human.userId,
      authorizedByEmail: input.human.email,
      decidedAt: this.clock.now(),
    };
    this.proposals.set(decided.id, decided);

    if (input.decision === "denied") {
      this.appendEvent({
        organizationId: proposal.organizationId,
        runId: proposal.runId,
        agentId: proposal.agentId,
        proposalId: proposal.id,
        toolName: "request_approval",
        inputs: { decision: "denied" },
        supportingSources: proposal.supportingSources,
        proposedChange: proposal.proposedChange,
        approvalStatus: "denied",
        authorizedByUserId: input.human.userId,
        authorizedByEmail: input.human.email,
        appliedEntityType: null,
        appliedEntityIds: [],
      });
      return { result: { ok: true }, proposal: decided };
    }

    const payloadCheck = assertPayloadNotConsequentialWrite(proposal.payload);
    if (!payloadCheck.ok) return { result: payloadCheck };
    const safePayload = forceDraftPayload(proposal.payload);
    const entity: AppliedEntity = {
      id: this.clock.id(),
      type: proposal.kind,
      organizationId: proposal.organizationId,
      facilityId: proposal.facilityId,
      data: { ...safePayload, review_state: "draft" },
    };
    this.entities.push(entity);
    this.appendEvent({
      organizationId: proposal.organizationId,
      runId: proposal.runId,
      agentId: proposal.agentId,
      proposalId: proposal.id,
      toolName: "request_approval",
      inputs: { decision: "approved" },
      supportingSources: proposal.supportingSources,
      proposedChange: proposal.proposedChange,
      approvalStatus: "approved",
      authorizedByUserId: input.human.userId,
      authorizedByEmail: input.human.email,
      appliedEntityType: proposal.kind,
      appliedEntityIds: [entity.id],
    });
    return { result: { ok: true }, proposal: decided, entity };
  }

  private appendEvent(
    event: Omit<AgentActionEvent, "id" | "createdAt">
  ): AgentActionEvent {
    const complete = validateActionEventCompleteness(event);
    if (!complete.ok) {
      throw new Error(`${complete.code}: ${complete.message}`);
    }
    const row: AgentActionEvent = {
      ...event,
      id: this.clock.id(),
      createdAt: this.clock.now(),
    };
    this.events.push(row);
    return row;
  }
}
