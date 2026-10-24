import { describe, expect, it } from "vitest";
import { CONFORMANCE_TESTS } from "@/lib/controls/specMeta";
import { AgentControlPlane } from "../plane";
import { validateActionEventCompleteness, isDualActorApply } from "../ledger";
import { filterChunksForTenant } from "../retrieval";
import { assertPayloadNotConsequentialWrite } from "../authorization";
import type { ObligationRow } from "../../types";
import type { AgentPrincipal, HumanPrincipal } from "../types";

function clock() {
  let n = 0;
  return {
    now: () => "2026-10-24T12:00:00.000Z",
    id: () => {
      n += 1;
      return `id-${n}`;
    },
  };
}

function human(over: Partial<HumanPrincipal> & Pick<HumanPrincipal, "jobFunction" | "orgRole">): HumanPrincipal {
  return {
    kind: "human",
    userId: over.userId ?? "user-1",
    email: over.email ?? "ehs@example.com",
    organizationId: over.organizationId ?? "org-1",
    orgRole: over.orgRole,
    jobFunction: over.jobFunction,
    facilityIds: over.facilityIds ?? null,
  };
}

function obligation(over: Partial<ObligationRow> = {}): ObligationRow {
  return {
    id: over.id ?? "ob-1",
    organization_id: over.organization_id ?? "org-1",
    facility_id: over.facility_id ?? "fac-1",
    title: over.title ?? "SPCC annual review",
    source_document: "SPCC plan",
    source_citation: "40 CFR 112",
    jurisdiction: "Federal",
    frequency: "Annual",
    owner_name: "EHS",
    evidence_required: "Signed review",
    status: "open",
    review_state: "draft",
    next_due_at: over.next_due_at ?? "2026-01-01",
    notes: null,
  };
}

function seededPlane(agentOver: Partial<AgentPrincipal> = {}) {
  const plane = new AgentControlPlane(clock());
  const manager = human({ jobFunction: "ehs_manager", orgRole: "owner" });
  const provisioned = plane.provisionDefaultAgent({ organizationId: "org-1", human: manager });
  const agent = provisioned.agent as AgentPrincipal;
  if (agentOver.capabilities || agentOver.facilityIds || agentOver.status || agentOver.organizationId) {
    plane.agents.set(agent.id, { ...agent, ...agentOver, id: agent.id });
  }
  return { plane, manager, agentId: agent.id };
}

describe("ICA conformance suite", () => {
  it("lists ICA-01 through ICA-12", () => {
    expect(CONFORMANCE_TESTS.map((t) => t.id)).toEqual([
      "ICA-01",
      "ICA-02",
      "ICA-03",
      "ICA-04",
      "ICA-05",
      "ICA-06",
      "ICA-07",
      "ICA-08",
      "ICA-09",
      "ICA-10",
      "ICA-11",
      "ICA-12",
    ]);
  });

  it("ICA-01 revoked-or-inactive-agent-cannot-run", () => {
    const { plane, manager, agentId } = seededPlane();
    const revoked = plane.revokeAgent(manager, agentId, "Key rotation");
    expect(revoked.ok).toBe(true);
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "identify_deadlines",
    });
    expect(run.result.ok).toBe(false);
    if (!run.result.ok) expect(run.result.code).toBe("AGENT_REVOKED");

    const { plane: p2, manager: m2, agentId: a2 } = seededPlane({ status: "suspended" });
    const suspended = p2.startRun({
      actor: m2,
      agentId: a2,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "identify_deadlines",
    });
    expect(suspended.result.ok).toBe(false);
    if (!suspended.result.ok) expect(suspended.result.code).toBe("AGENT_SUSPENDED");
  });

  it("ICA-02 missing-capability-cannot-propose", () => {
    const { plane, manager, agentId } = seededPlane({
      capabilities: ["identify_deadlines", "request_approval"],
    });
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    expect(run.run).toBeTruthy();
    const proposed = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:spill",
      payload: { finding: "Spill kit incomplete", status: "open", review_state: "draft" },
      supportingSources: [{ filename: "Register", excerpt: "Overdue SPCC" }],
      toolName: "propose_tasks",
    });
    expect(proposed.result.ok).toBe(false);
    if (!proposed.result.ok) expect(proposed.result.code).toBe("MISSING_CAPABILITY");
  });

  it("ICA-03 agent-cannot-mark-approved", () => {
    expect(assertPayloadNotConsequentialWrite({ review_state: "approved" }).ok).toBe(false);
    expect(assertPayloadNotConsequentialWrite({ status: "closed" }).ok).toBe(false);
    const { plane, manager, agentId } = seededPlane();
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    const proposed = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:approved-attempt",
      payload: { finding: "Try to approve", review_state: "approved" },
      supportingSources: [{ filename: "Register", excerpt: "x" }],
      toolName: "propose_tasks",
    });
    expect(proposed.result.ok).toBe(false);
    if (!proposed.result.ok) expect(proposed.result.code).toBe("AGENT_CANNOT_APPROVE_RECORD");
  });

  it("ICA-04 employee-cannot-approve", () => {
    const { plane, manager, agentId } = seededPlane();
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    const proposed = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:cap-1",
      payload: { finding: "Missing SDS", status: "open", review_state: "draft" },
      supportingSources: [{ filename: "Register", excerpt: "SDS overdue" }],
      toolName: "propose_tasks",
    });
    const employee = human({ jobFunction: "employee", orgRole: "viewer", userId: "emp-1", email: "emp@example.com" });
    const decision = plane.decideProposal({
      proposalId: proposed.proposal!.id,
      actor: employee,
      human: employee,
      decision: "approved",
    });
    expect(decision.result.ok).toBe(false);
    if (!decision.result.ok) expect(decision.result.code).toBe("EMPLOYEE_CANNOT_APPROVE");
  });

  it("ICA-05 agent-cannot-self-approve", () => {
    const { plane, manager, agentId } = seededPlane();
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    const proposed = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:cap-2",
      payload: { finding: "Housekeeping", status: "open", review_state: "draft" },
      supportingSources: [{ filename: "Walkdown", excerpt: "Aisle blocked" }],
      toolName: "propose_tasks",
    });
    const decision = plane.decideProposal({
      proposalId: proposed.proposal!.id,
      actor: { kind: "agent", agentId },
      decision: "approved",
    });
    expect(decision.result.ok).toBe(false);
    if (!decision.result.ok) expect(decision.result.code).toBe("AGENT_SELF_APPROVE");
  });

  it("ICA-06 denied-proposal-writes-nothing", () => {
    const { plane, manager, agentId } = seededPlane();
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    const proposed = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:cap-3",
      payload: { finding: "Eyewash inspection", status: "open", review_state: "draft" },
      supportingSources: [{ filename: "Register", excerpt: "Weekly eyewash" }],
      toolName: "propose_tasks",
    });
    const before = plane.entities.length;
    const decision = plane.decideProposal({
      proposalId: proposed.proposal!.id,
      actor: manager,
      human: manager,
      decision: "denied",
    });
    expect(decision.result.ok).toBe(true);
    expect(plane.entities.length).toBe(before);
    expect(decision.entity).toBeUndefined();
  });

  it("ICA-07 approved-proposal-dual-actor-audit", () => {
    const { plane, manager, agentId } = seededPlane();
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    const proposed = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:cap-4",
      payload: { finding: "Secondary containment", status: "open", review_state: "draft" },
      supportingSources: [{ filename: "SPCC", citation: "40 CFR 112", excerpt: "Containment cracked" }],
      toolName: "propose_tasks",
    });
    const decision = plane.decideProposal({
      proposalId: proposed.proposal!.id,
      actor: manager,
      human: manager,
      decision: "approved",
    });
    expect(decision.result.ok).toBe(true);
    expect(decision.entity?.data.review_state).toBe("draft");
    const applyEvent = plane.events.find(
      (e) => e.proposalId === proposed.proposal!.id && e.approvalStatus === "approved"
    );
    expect(applyEvent).toBeTruthy();
    expect(isDualActorApply(applyEvent!)).toBe(true);
    expect(applyEvent!.toolName).toBe("request_approval");
    expect(applyEvent!.supportingSources.length).toBeGreaterThan(0);
    expect(applyEvent!.appliedEntityIds.length).toBe(1);
  });

  it("ICA-08 facility-scope-isolation", () => {
    const { plane, manager, agentId } = seededPlane({ facilityIds: ["fac-1"] });
    const otherFacility = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-2",
      trigger: "identify_deadlines",
    });
    expect(otherFacility.result.ok).toBe(false);
    if (!otherFacility.result.ok) expect(otherFacility.result.code).toBe("FACILITY_SCOPE");

    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    const executed = plane.executeTool({
      runId: run.run!.id,
      tool: "propose_tasks",
      context: {
        organizationId: "org-1",
        organizationName: "Acme",
        facilityId: "fac-1",
        facilityName: "Plant 1",
        obligations: [
          obligation({ id: "ob-a", facility_id: "fac-1", title: "Plant 1 SPCC" }),
          obligation({ id: "ob-b", facility_id: "fac-2", title: "Plant 2 SPCC" }),
        ],
        actions: [],
        evidence: [],
      },
    });
    expect(executed.result.ok).toBe(true);
    expect(executed.proposals.every((p) => p.facilityId === "fac-1")).toBe(true);
    expect(executed.proposals.some((p) => p.payload.finding && String(p.payload.finding).includes("Plant 2"))).toBe(
      false
    );
  });

  it("ICA-09 cross-organization-isolation", () => {
    const { plane, manager, agentId } = seededPlane();
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-2",
      facilityId: "fac-9",
      trigger: "identify_deadlines",
    });
    expect(run.result.ok).toBe(false);
    if (!run.result.ok) expect(run.result.code).toBe("CROSS_ORG");
  });

  it("ICA-10 audit-completeness", () => {
    expect(validateActionEventCompleteness({ toolName: "", supportingSources: [{ filename: "x" }] }).ok).toBe(false);
    expect(validateActionEventCompleteness({ toolName: "propose_tasks", supportingSources: [] }).ok).toBe(false);
    expect(
      validateActionEventCompleteness({
        toolName: "propose_tasks",
        supportingSources: [{ filename: "SPCC", excerpt: "due" }],
      }).ok
    ).toBe(true);
  });

  it("ICA-11 shared-secret-is-not-an-agent", () => {
    const { plane, agentId } = seededPlane();
    const run = plane.startRun({
      actor: { kind: "shared_secret", label: "CRON_SECRET" },
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "identify_deadlines",
    });
    expect(run.result.ok).toBe(false);
    if (!run.result.ok) expect(run.result.code).toBe("SHARED_SECRET_NOT_AGENT");
  });

  it("ICA-12 unbounded-proposal-loop-blocked", () => {
    const { plane, manager, agentId } = seededPlane();
    const run = plane.startRun({
      actor: manager,
      agentId,
      organizationId: "org-1",
      facilityId: "fac-1",
      trigger: "propose_tasks",
    });
    const first = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:same-finding",
      payload: { finding: "Same finding", status: "open", review_state: "draft" },
      supportingSources: [{ filename: "Register", excerpt: "repeat" }],
      toolName: "propose_tasks",
    });
    expect(first.result.ok).toBe(true);
    const second = plane.createProposal({
      agentId,
      runId: run.run!.id,
      organizationId: "org-1",
      facilityId: "fac-1",
      kind: "corrective_action",
      dedupeKey: "corrective_action:fac-1:same-finding",
      payload: { finding: "Same finding", status: "open", review_state: "draft" },
      supportingSources: [{ filename: "Register", excerpt: "repeat" }],
      toolName: "propose_tasks",
    });
    expect(second.result.ok).toBe(false);
    if (!second.result.ok) expect(second.result.code).toBe("DUPLICATE_PROPOSAL");
  });

  it("filters retrieval hits across tenants", () => {
    const hits = [{ document_id: "shared" }, { document_id: "ours" }, { document_id: "theirs" }];
    const docs = [
      { id: "shared", organization_id: null, facility_id: null },
      { id: "ours", organization_id: "org-1", facility_id: "fac-1" },
      { id: "theirs", organization_id: "org-2", facility_id: "fac-9" },
    ];
    const filtered = filterChunksForTenant(hits, docs, { organizationId: "org-1", facilityId: "fac-1" });
    expect(filtered.map((h) => h.document_id).sort()).toEqual(["ours", "shared"]);
  });
});
