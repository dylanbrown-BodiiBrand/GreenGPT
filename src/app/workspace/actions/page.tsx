import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { canEditWorkspace } from "@/lib/workspace/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CorrectiveActionRow } from "@/lib/workspace/types";
import { PILOT_PREVIEW } from "@/lib/workspace/sampleWorkspace";
import { EmptyState, PilotBanner } from "../ui";
import { ActionsClient } from "./ActionsClient";

export const metadata: Metadata = { title: "Corrective Actions" };

export default async function ActionsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);
  const canEdit = memberships[0] ? canEditWorkspace(memberships[0].role) : false;
  let rows: CorrectiveActionRow[] = [];

  if (overview.mode === "pilot_preview") {
    rows = [...PILOT_PREVIEW.overdueActions, ...PILOT_PREVIEW.awaitingReview];
  } else if (memberships[0]) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("corrective_actions")
      .select(
        "id, organization_id, facility_id, finding, description, owner_name, due_date, priority, evidence_required, evidence_link, status, reviewer_name, notes, source_references"
      )
      .eq("organization_id", memberships[0].organizationId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50);
    rows = (data ?? []) as CorrectiveActionRow[];
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Corrective actions</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Findings with owners, due dates, evidence requirements, and status. Closing an action is recorded in the audit
        trail.
      </p>

      {overview.facilities.length === 0 && overview.mode === "live" ? (
        <div className="mt-6">
          <EmptyState title="No facilities" body="Add facilities before creating corrective actions." />
        </div>
      ) : (
        <div className="mt-6">
          <ActionsClient
            facilities={overview.facilities.map((f) => ({ id: f.id, name: f.name }))}
            actions={rows as never}
            canEdit={canEdit}
            preview={overview.mode === "pilot_preview"}
          />
        </div>
      )}
    </div>
  );
}
