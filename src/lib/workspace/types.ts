export type OrgRole = "owner" | "admin" | "editor" | "viewer";

export type ReviewState = "draft" | "reviewed" | "approved" | "needs_clarification" | "archived";

export type CorrectiveActionStatus =
  | "open"
  | "in_progress"
  | "awaiting_evidence"
  | "awaiting_review"
  | "closed";

export type EvidenceStatus = "missing" | "uploaded" | "reviewed" | "audit_ready";

export type FacilityRow = {
  id: string;
  organization_id: string;
  name: string;
  state: string | null;
  industry: string | null;
  employee_count: string | null;
  status: string;
};

export type ObligationRow = {
  id: string;
  organization_id: string;
  facility_id: string;
  title: string;
  source_document: string | null;
  source_citation: string | null;
  jurisdiction: string | null;
  frequency: string | null;
  owner_name: string | null;
  evidence_required: string | null;
  status: string;
  review_state: ReviewState;
  next_due_at: string | null;
  notes: string | null;
};

export type CorrectiveActionRow = {
  id: string;
  organization_id: string;
  facility_id: string;
  finding: string;
  description: string | null;
  owner_name: string | null;
  due_date: string | null;
  priority: string;
  evidence_required: string | null;
  evidence_link: string | null;
  status: CorrectiveActionStatus;
  reviewer_name: string | null;
  notes: string | null;
  source_references?: string | null;
};

export type EvidenceItemRow = {
  id: string;
  organization_id: string;
  facility_id: string;
  title: string;
  required_proof: string | null;
  status: EvidenceStatus;
  last_reviewed_at: string | null;
  notes: string | null;
};

export type WorkspaceDocumentRow = {
  id: string;
  organization_id: string;
  facility_id: string | null;
  title: string;
  doc_type: string | null;
  approval_status: ReviewState;
  notes: string | null;
};

export type WorkspaceOverview = {
  mode: "live" | "pilot_preview";
  organizationName: string | null;
  facilities: FacilityRow[];
  upcomingObligations: ObligationRow[];
  overdueActions: CorrectiveActionRow[];
  awaitingReview: CorrectiveActionRow[];
  missingEvidence: EvidenceItemRow[];
  recentDocuments: WorkspaceDocumentRow[];
  latestBriefingLabel: string | null;
};

export const INSUFFICIENT_SOURCES_MESSAGE =
  "I couldn’t support this answer from the approved documents currently available for this facility. Add or select an appropriate source, or route the question for EHS review.";

export function isReviewState(value: string): value is ReviewState {
  return ["draft", "reviewed", "approved", "needs_clarification", "archived"].includes(value);
}

export function isCorrectiveActionStatus(value: string): value is CorrectiveActionStatus {
  return ["open", "in_progress", "awaiting_evidence", "awaiting_review", "closed"].includes(value);
}
