import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/requireSessionUser";
import { listMembershipsForUser } from "./membership";
import { emptyLiveOverview, PILOT_PREVIEW } from "./sampleWorkspace";
import type {
  CorrectiveActionRow,
  EvidenceItemRow,
  FacilityRow,
  ObligationRow,
  WorkspaceDocumentRow,
  WorkspaceOverview,
} from "./types";

export async function getWorkspaceOverview(user: SessionUser): Promise<WorkspaceOverview> {
  const memberships = await listMembershipsForUser(user);
  if (!memberships.length) return PILOT_PREVIEW;

  const org = memberships[0];
  const supabase = await createSupabaseServerClient();

  const { data: facilities, error: facErr } = await supabase
    .from("facilities")
    .select("id, organization_id, name, state, industry, employee_count, status")
    .eq("organization_id", org.organizationId)
    .order("name");

  if (facErr) return PILOT_PREVIEW;

  const facilityRows = (facilities ?? []) as FacilityRow[];
  if (!facilityRows.length) {
    return emptyLiveOverview(org.organizationName, []);
  }

  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [{ data: obligations }, { data: actions }, { data: evidence }, { data: documents }] =
    await Promise.all([
      supabase
        .from("obligations")
        .select(
          "id, organization_id, facility_id, title, source_document, source_citation, jurisdiction, frequency, owner_name, evidence_required, status, review_state, next_due_at, notes"
        )
        .eq("organization_id", org.organizationId)
        .gte("next_due_at", today)
        .lte("next_due_at", in30)
        .order("next_due_at")
        .limit(10),
      supabase
        .from("corrective_actions")
        .select(
          "id, organization_id, facility_id, finding, description, owner_name, due_date, priority, evidence_required, evidence_link, status, reviewer_name, notes"
        )
        .eq("organization_id", org.organizationId)
        .in("status", ["open", "in_progress", "awaiting_evidence", "awaiting_review"])
        .order("due_date")
        .limit(20),
      supabase
        .from("evidence_items")
        .select(
          "id, organization_id, facility_id, title, required_proof, status, last_reviewed_at, notes"
        )
        .eq("organization_id", org.organizationId)
        .eq("status", "missing")
        .limit(10),
      supabase
        .from("workspace_documents")
        .select("id, organization_id, facility_id, title, doc_type, approval_status, notes")
        .eq("organization_id", org.organizationId)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

  const actionRows = (actions ?? []) as CorrectiveActionRow[];

  return {
    mode: "live",
    organizationName: org.organizationName,
    facilities: facilityRows,
    upcomingObligations: (obligations ?? []) as ObligationRow[],
    overdueActions: actionRows.filter(
      (a) => a.due_date && a.due_date < today && a.status !== "closed"
    ),
    awaitingReview: actionRows.filter((a) => a.status === "awaiting_review"),
    missingEvidence: (evidence ?? []) as EvidenceItemRow[],
    recentDocuments: (documents ?? []) as WorkspaceDocumentRow[],
    latestBriefingLabel: null,
  };
}

export async function listFacilitiesForUser(user: SessionUser): Promise<FacilityRow[]> {
  const overview = await getWorkspaceOverview(user);
  return overview.facilities;
}
