import type {
  CorrectiveActionRow,
  EvidenceItemRow,
  ObligationRow,
  WorkspaceOverview,
} from "./types";

export type BriefingContent = {
  periodLabel: string;
  organizationName: string;
  facilityName: string | null;
  upcomingObligations: { title: string; nextDue: string | null; owner: string | null; reviewState: string }[];
  openActions: { finding: string; status: string; dueDate: string | null; priority: string }[];
  missingEvidence: { title: string; requiredProof: string | null }[];
  managementAttention: string[];
  generatedAt: string;
  disclaimer: string;
};

export function buildBriefingContent(input: {
  periodLabel: string;
  organizationName: string;
  facilityName: string | null;
  obligations: ObligationRow[];
  actions: CorrectiveActionRow[];
  evidence: EvidenceItemRow[];
}): BriefingContent {
  const today = new Date().toISOString().slice(0, 10);
  const openActions = input.actions.filter((a) => a.status !== "closed");
  const overdue = openActions.filter((a) => a.due_date && a.due_date < today);
  const awaiting = openActions.filter((a) => a.status === "awaiting_review" || a.status === "awaiting_evidence");

  const managementAttention: string[] = [];
  if (overdue.length) managementAttention.push(`${overdue.length} overdue corrective action(s)`);
  if (awaiting.length) managementAttention.push(`${awaiting.length} item(s) awaiting evidence or review`);
  if (input.evidence.length) managementAttention.push(`${input.evidence.length} missing evidence item(s)`);
  if (!managementAttention.length) managementAttention.push("No critical follow-ups flagged in this draft period.");

  return {
    periodLabel: input.periodLabel,
    organizationName: input.organizationName,
    facilityName: input.facilityName,
    upcomingObligations: input.obligations.slice(0, 12).map((o) => ({
      title: o.title,
      nextDue: o.next_due_at,
      owner: o.owner_name,
      reviewState: o.review_state,
    })),
    openActions: openActions.slice(0, 12).map((a) => ({
      finding: a.finding,
      status: a.status,
      dueDate: a.due_date,
      priority: a.priority,
    })),
    missingEvidence: input.evidence.slice(0, 12).map((e) => ({
      title: e.title,
      requiredProof: e.required_proof,
    })),
    managementAttention,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Draft briefing assembled from workspace records. Requires EHS review before distribution. Not legal advice.",
  };
}

export function defaultInspectionChecklist(): { id: string; label: string; done: boolean }[] {
  return [
    { id: "1", label: "Review prior inspection findings and open corrective actions", done: false },
    { id: "2", label: "Confirm permit and plan conditions in scope for this walkdown", done: false },
    { id: "3", label: "Verify required PPE and area access controls", done: false },
    { id: "4", label: "Check emergency equipment (eyewash, extinguishers, exits)", done: false },
    { id: "5", label: "Review housekeeping and secondary containment condition", done: false },
    { id: "6", label: "Confirm training / qualification records for area personnel", done: false },
    { id: "7", label: "Identify evidence to collect (photos, logs, measurements)", done: false },
    { id: "8", label: "Assign owners and due dates for any new findings", done: false },
  ];
}

export function overviewHasLiveData(overview: WorkspaceOverview): boolean {
  return overview.mode === "live" && overview.facilities.length > 0;
}
