/** Canonical metadata for the Industrial Compliance Agent control specification. */

export const SPEC_ID = "greengpt-industrial-compliance-agent";
export const SPEC_VERSION = "1.3.0";
export const SPEC_TITLE = "GreenGPT Industrial Compliance Agent — Technical Control Specification";
export const SPEC_PATH = "docs/controls/industrial-compliance-agent.md";
export const SPEC_PUBLIC_PATH = "/controls";

export const AGENT_CAPABILITIES = [
  "identify_deadlines",
  "propose_tasks",
  "prepare_records",
  "populate_register",
  "request_approval",
] as const;

export const JOB_FUNCTIONS = ["ehs_manager", "facility_admin", "employee"] as const;

export type ConformanceTestId =
  | "ICA-01"
  | "ICA-02"
  | "ICA-03"
  | "ICA-04"
  | "ICA-05"
  | "ICA-06"
  | "ICA-07"
  | "ICA-08"
  | "ICA-09"
  | "ICA-10"
  | "ICA-11"
  | "ICA-12"
  | "ICA-13"
  | "ICA-14"
  | "ICA-15"
  | "ICA-16"
  | "ICA-17";

export type ConformanceTestDef = {
  id: ConformanceTestId;
  name: string;
  control: string;
  requirement: string;
};

export const CONFORMANCE_TESTS: ConformanceTestDef[] = [
  {
    id: "ICA-01",
    name: "revoked-or-inactive-agent-cannot-run",
    control: "Identity / revocation",
    requirement: "A suspended or revoked agent MUST NOT start a run or invoke tools.",
  },
  {
    id: "ICA-02",
    name: "missing-capability-cannot-propose",
    control: "Authorization",
    requirement: "An agent without propose_tasks MUST NOT create a corrective-action proposal.",
  },
  {
    id: "ICA-03",
    name: "agent-cannot-mark-approved",
    control: "Autonomy boundary",
    requirement: "An agent MUST NOT persist a record with review_state approved or close a CAP.",
  },
  {
    id: "ICA-04",
    name: "employee-cannot-approve",
    control: "Authorization",
    requirement: "A principal with job function employee MUST NOT approve or deny an agent proposal.",
  },
  {
    id: "ICA-05",
    name: "agent-cannot-self-approve",
    control: "Delegated authority",
    requirement: "An agent MUST NOT approve its own proposal.",
  },
  {
    id: "ICA-06",
    name: "denied-proposal-writes-nothing",
    control: "Approval gate",
    requirement: "A denied proposal MUST leave no entity write.",
  },
  {
    id: "ICA-07",
    name: "approved-proposal-dual-actor-audit",
    control: "Audit",
    requirement:
      "An approved apply MUST record dual-actor provenance (agent proposed, human authorized) plus tools and sources.",
  },
  {
    id: "ICA-08",
    name: "facility-scope-isolation",
    control: "Authorization / tenancy",
    requirement: "A facility-scoped agent MUST NOT read or write another facility.",
  },
  {
    id: "ICA-09",
    name: "cross-organization-isolation",
    control: "Authorization / tenancy",
    requirement: "An agent MUST NOT act in another organization.",
  },
  {
    id: "ICA-10",
    name: "audit-completeness",
    control: "Audit",
    requirement:
      "An agent action event missing tools or supporting information MUST fail conformance.",
  },
  {
    id: "ICA-11",
    name: "shared-secret-is-not-an-agent",
    control: "Identity",
    requirement: "A shared job secret (CRON_SECRET) MUST NOT be treated as an agent principal.",
  },
  {
    id: "ICA-12",
    name: "unbounded-proposal-loop-blocked",
    control: "Misuse",
    requirement: "Duplicate pending proposals for the same finding and facility MUST be rejected.",
  },
  {
    id: "ICA-13",
    name: "unsourced-obligation-refused",
    control: "Register population",
    requirement: "An obligation proposal without a citation or ARDR source row MUST be refused.",
  },
  {
    id: "ICA-14",
    name: "approved-obligation-lands-draft",
    control: "Autonomy boundary",
    requirement: "An approved obligation proposal MUST persist with status and review_state draft.",
  },
  {
    id: "ICA-15",
    name: "duplicate-obligation-rejected",
    control: "Misuse",
    requirement:
      "An obligation matching a pending proposal or register row for the same facility, citation, and requirement MUST be rejected.",
  },
  {
    id: "ICA-16",
    name: "non-applicable-row-not-imported",
    control: "Register population",
    requirement: "ARDR rows marked No or left blank in Applies? MUST NOT become proposals.",
  },
  {
    id: "ICA-17",
    name: "retrieval-tenant-isolation",
    control: "Authorization / tenancy",
    requirement:
      "Retrieval MUST return only categorized, in-jurisdiction shared documents plus the requester's own approved, in-facility client documents.",
  },
];

export const IMPLEMENTED_CONTROLS = [
  "First-class agent identity with scoped, revocable grants",
  "Human job functions: EHS manager, facility administrator, employee",
  "Approval-gated tools: identify deadlines, propose tasks, prepare records",
  "Approval-gated register population from a human-completed ARDR worksheet",
  "Append-only agent action ledger with dual-actor apply events",
  "Organization-filtered retrieval: client documents reach only their own organization, and only once approved",
  "Named Vitest conformance suite ICA-01 through ICA-17",
] as const;
