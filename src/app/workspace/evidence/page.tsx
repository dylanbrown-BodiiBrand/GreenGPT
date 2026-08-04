import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { canEditWorkspace } from "@/lib/workspace/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EvidenceItemRow } from "@/lib/workspace/types";
import { PILOT_PREVIEW } from "@/lib/workspace/sampleWorkspace";
import { EmptyState, PilotBanner } from "../ui";
import { EvidenceClient } from "./EvidenceClient";

export const metadata: Metadata = { title: "Evidence" };

export default async function EvidencePage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);
  const canEdit = memberships[0] ? canEditWorkspace(memberships[0].role) : false;
  let rows: EvidenceItemRow[] = overview.missingEvidence;

  if (overview.mode === "pilot_preview") {
    rows = PILOT_PREVIEW.missingEvidence;
  } else if (memberships[0]) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("evidence_items")
      .select(
        "id, organization_id, facility_id, title, required_proof, status, last_reviewed_at, notes"
      )
      .eq("organization_id", memberships[0].organizationId)
      .order("updated_at", { ascending: false })
      .limit(50);
    rows = (data ?? []) as EvidenceItemRow[];
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Evidence tracker</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Required proof and audit-ready status. Status changes are written to the workspace audit trail.
      </p>

      {overview.facilities.length === 0 && overview.mode === "live" ? (
        <div className="mt-6">
          <EmptyState title="No facilities" body="Add facilities before tracking evidence." />
        </div>
      ) : (
        <div className="mt-6">
          <EvidenceClient
            facilities={overview.facilities.map((f) => ({ id: f.id, name: f.name }))}
            items={rows}
            canEdit={canEdit}
            preview={overview.mode === "pilot_preview"}
          />
        </div>
      )}
    </div>
  );
}
