import type { OrgRole } from "../types";

export type JobFunction = "ehs_manager" | "facility_admin" | "employee";

export type AgentStatus = "active" | "suspended" | "revoked";

export type AgentCapability =
  | "identify_deadlines"
  | "propose_tasks"
  | "prepare_records"
  | "request_approval";

export type ActorKind = "human" | "agent" | "shared_secret";

export type AgentRunStatus = "running" | "awaiting_approval" | "completed" | "cancelled" | "failed";

export type ApprovalStatus = "pending" | "approved" | "denied" | "expired" | "not_required";

export type ProposalKind = "corrective_action" | "inspection_prep" | "briefing" | "deadline_alert";

export type SupportingSource = {
  documentId?: string;
  filename?: string;
  citation?: string;
  score?: number;
  excerpt?: string;
};

export type ProposedChange = {
  before: unknown;
  after: unknown;
};

export type AgentPrincipal = {
  id: string;
  organizationId: string;
  name: string;
  status: AgentStatus;
  delegatedByUserId: string | null;
  delegatedByEmail: string | null;
  facilityIds: string[] | null;
  capabilities: AgentCapability[];
  revokedAt: string | null;
  revokedByUserId: string | null;
  revokeReason: string | null;
};

export type HumanPrincipal = {
  kind: "human";
  userId: string;
  email: string;
  organizationId: string;
  orgRole: OrgRole;
  jobFunction: JobFunction;
  facilityIds: string[] | null;
};

export type SharedSecretActor = {
  kind: "shared_secret";
  label: string;
};

export type TriggerActor = HumanPrincipal | SharedSecretActor | { kind: "agent"; agentId: string };

export type AgentRun = {
  id: string;
  organizationId: string;
  agentId: string;
  facilityId: string | null;
  trigger: string;
  status: AgentRunStatus;
  startedByUserId: string | null;
  startedByEmail: string | null;
  createdAt: string;
};

export type AgentProposal = {
  id: string;
  organizationId: string;
  facilityId: string | null;
  agentId: string;
  runId: string;
  kind: ProposalKind;
  status: ApprovalStatus;
  dedupeKey: string;
  payload: Record<string, unknown>;
  proposedChange: ProposedChange;
  supportingSources: SupportingSource[];
  authorizedByUserId: string | null;
  authorizedByEmail: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type AgentActionEvent = {
  id: string;
  organizationId: string;
  runId: string | null;
  agentId: string;
  proposalId: string | null;
  toolName: string;
  inputs: Record<string, unknown>;
  supportingSources: SupportingSource[];
  proposedChange: ProposedChange | null;
  approvalStatus: ApprovalStatus;
  authorizedByUserId: string | null;
  authorizedByEmail: string | null;
  appliedEntityType: string | null;
  appliedEntityIds: string[];
  createdAt: string;
};

export type AppliedEntity = {
  id: string;
  type: ProposalKind | string;
  organizationId: string;
  facilityId: string | null;
  data: Record<string, unknown>;
};

export type AuthzResult = { ok: true } | { ok: false; code: string; message: string };

export const DEFAULT_AGENT_NAME = "GreenGPT Compliance Agent";

export const DEFAULT_CAPABILITIES: AgentCapability[] = [
  "identify_deadlines",
  "propose_tasks",
  "prepare_records",
  "request_approval",
];

export const MAX_PROPOSALS_PER_RUN = 10;

export const ALL_CAPABILITIES: AgentCapability[] = [
  "identify_deadlines",
  "propose_tasks",
  "prepare_records",
  "request_approval",
];
