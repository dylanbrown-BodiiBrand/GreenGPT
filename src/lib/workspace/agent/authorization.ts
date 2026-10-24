import { canActAtFacility, canApproveAgentProposals, canManageAgents } from "../roles";
import type {
  AgentCapability,
  AgentPrincipal,
  AgentProposal,
  AuthzResult,
  HumanPrincipal,
  TriggerActor,
} from "./types";

export function deny(code: string, message: string): AuthzResult {
  return { ok: false, code, message };
}

export function allow(): AuthzResult {
  return { ok: true };
}

export function assertNotSharedSecret(actor: TriggerActor): AuthzResult {
  if (actor.kind === "shared_secret") {
    return deny("SHARED_SECRET_NOT_AGENT", "A shared job secret is not an agent principal.");
  }
  return allow();
}

export function assertAgentActive(agent: AgentPrincipal | null): AuthzResult {
  if (!agent) return deny("AGENT_NOT_FOUND", "Agent identity was not found.");
  if (agent.status === "revoked") return deny("AGENT_REVOKED", "This agent has been revoked.");
  if (agent.status === "suspended") return deny("AGENT_SUSPENDED", "This agent is suspended.");
  if (agent.status !== "active") return deny("AGENT_INACTIVE", "This agent is not active.");
  return allow();
}

export function assertSameOrganization(agentOrgId: string, targetOrgId: string): AuthzResult {
  if (agentOrgId !== targetOrgId) {
    return deny("CROSS_ORG", "Agent cannot act in another organization.");
  }
  return allow();
}

export function assertAgentFacilityScope(
  agent: AgentPrincipal,
  facilityId: string | null
): AuthzResult {
  if (!canActAtFacility(agent.facilityIds, facilityId)) {
    return deny("FACILITY_SCOPE", "Agent is not authorized for this facility.");
  }
  return allow();
}

export function assertCapability(agent: AgentPrincipal, capability: AgentCapability): AuthzResult {
  if (!agent.capabilities.includes(capability)) {
    return deny("MISSING_CAPABILITY", `Agent is not granted ${capability}.`);
  }
  return allow();
}

export function assertCanStartRun(input: {
  actor: TriggerActor;
  agent: AgentPrincipal | null;
  organizationId: string;
  facilityId: string | null;
}): AuthzResult {
  const secret = assertNotSharedSecret(input.actor);
  if (!secret.ok) return secret;
  if (input.actor.kind === "human" && input.actor.organizationId !== input.organizationId) {
    return deny("CROSS_ORG", "Actor cannot start a run in another organization.");
  }
  const active = assertAgentActive(input.agent);
  if (!active.ok) return active;
  const agent = input.agent as AgentPrincipal;
  const org = assertSameOrganization(agent.organizationId, input.organizationId);
  if (!org.ok) return org;
  return assertAgentFacilityScope(agent, input.facilityId);
}

export function assertCanUseTool(input: {
  agent: AgentPrincipal;
  capability: AgentCapability;
  organizationId: string;
  facilityId: string | null;
}): AuthzResult {
  const active = assertAgentActive(input.agent);
  if (!active.ok) return active;
  const org = assertSameOrganization(input.agent.organizationId, input.organizationId);
  if (!org.ok) return org;
  const scope = assertAgentFacilityScope(input.agent, input.facilityId);
  if (!scope.ok) return scope;
  return assertCapability(input.agent, input.capability);
}

export function assertHumanCanApprove(input: {
  human: HumanPrincipal;
  agent: AgentPrincipal;
  proposal: AgentProposal;
}): AuthzResult {
  if (input.human.kind !== "human") {
    return deny("HUMAN_REQUIRED", "Only a human principal may approve a proposal.");
  }
  if (input.human.organizationId !== input.proposal.organizationId) {
    return deny("CROSS_ORG", "Approver is not a member of this organization.");
  }
  if (input.agent.organizationId !== input.proposal.organizationId) {
    return deny("CROSS_ORG", "Agent cannot act in another organization.");
  }
  if (!canApproveAgentProposals(input.human.jobFunction)) {
    return deny("EMPLOYEE_CANNOT_APPROVE", "Employees cannot approve agent proposals.");
  }
  if (!canActAtFacility(input.human.facilityIds, input.proposal.facilityId)) {
    return deny("FACILITY_SCOPE", "Approver is not authorized for this facility.");
  }
  if (
    input.human.jobFunction === "facility_admin" &&
    !canActAtFacility(input.agent.facilityIds, input.proposal.facilityId)
  ) {
    return deny("FACILITY_SCOPE", "Proposal is outside the agent's facility scope.");
  }
  return allow();
}

export function assertAgentCannotApprove(actor: { kind: string }): AuthzResult {
  if (actor.kind === "agent") {
    return deny("AGENT_SELF_APPROVE", "An agent cannot approve its own proposal.");
  }
  return allow();
}

export function assertCanRevoke(human: HumanPrincipal, agent: AgentPrincipal): AuthzResult {
  if (human.organizationId !== agent.organizationId) {
    return deny("CROSS_ORG", "Cannot revoke an agent in another organization.");
  }
  if (!canManageAgents(human.jobFunction)) {
    return deny("MANAGER_REQUIRED", "Only an EHS manager may revoke an org-wide agent.");
  }
  return allow();
}

export function assertCanManageAgent(human: HumanPrincipal, organizationId: string): AuthzResult {
  if (human.organizationId !== organizationId) {
    return deny("CROSS_ORG", "Cannot manage agents in another organization.");
  }
  if (!canManageAgents(human.jobFunction)) {
    return deny("MANAGER_REQUIRED", "Only an EHS manager may create or revoke agents.");
  }
  return allow();
}

const FORBIDDEN_REVIEW_STATES = new Set(["approved"]);
const FORBIDDEN_CAP_STATUSES = new Set(["closed"]);

export function assertPayloadNotConsequentialWrite(payload: Record<string, unknown>): AuthzResult {
  const reviewState = payload.review_state ?? payload.reviewState;
  if (typeof reviewState === "string" && FORBIDDEN_REVIEW_STATES.has(reviewState)) {
    return deny("AGENT_CANNOT_APPROVE_RECORD", "Agent cannot mark a record approved.");
  }
  const status = payload.status;
  if (typeof status === "string" && FORBIDDEN_CAP_STATUSES.has(status)) {
    return deny("AGENT_CANNOT_CLOSE_CAP", "Agent cannot close a corrective action.");
  }
  if (payload.sendEmail || payload.externalCommunication || payload.notifyRegulator) {
    return deny("AGENT_CANNOT_SEND", "Agent cannot send external communications.");
  }
  return allow();
}

export function forceDraftPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };
  if ("review_state" in next) next.review_state = "draft";
  if ("reviewState" in next) next.reviewState = "draft";
  if (next.status === "closed") next.status = "open";
  delete next.sendEmail;
  delete next.externalCommunication;
  delete next.notifyRegulator;
  return next;
}
