import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { canEditWorkspace } from "@/lib/workspace/roles";
import { defaultInspectionChecklist } from "@/lib/workspace/briefingBuilder";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState, PilotBanner } from "../ui";
import { InspectionsClient } from "./InspectionsClient";
import type { ReviewState } from "@/lib/workspace/types";

export const metadata: Metadata = { title: "Inspection Prep" };

const PREVIEW_INSPECTIONS = [
  {
    id: "preview-insp-1",
    facility_id: "preview-fac-1",
    title: "Monthly facility walkdown prep (sample)",
    inspection_type: "facility",
    scheduled_for: "2026-08-15",
    summary: "Pilot preview checklist — not a live packet.",
    checklist: defaultInspectionChecklist().map((c, i) => ({ ...c, done: i < 2 })),
    review_state: "draft" as ReviewState,
  },
];

export default async function InspectionsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);
  const canEdit = memberships[0] ? canEditWorkspace(memberships[0].role) : false;

  let inspections = PREVIEW_INSPECTIONS;
  if (overview.mode === "live" && memberships[0]) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("inspection_preps")
      .select(
        "id, facility_id, title, inspection_type, scheduled_for, summary, checklist, review_state"
      )
      .eq("organization_id", memberships[0].organizationId)
      .order("created_at", { ascending: false })
      .limit(30);
    inspections = (data ?? []) as typeof PREVIEW_INSPECTIONS;
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Inspection preparation</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Draft prep packets and checklists for facility or regulatory inspections. Mark reviewed/approved after EHS
        review — never auto-approved.
      </p>

      {overview.facilities.length === 0 && overview.mode === "live" ? (
        <div className="mt-6">
          <EmptyState title="No facilities" body="Provision facilities before creating inspection prep packets." />
        </div>
      ) : (
        <div className="mt-6">
          <InspectionsClient
            facilities={overview.facilities.map((f) => ({ id: f.id, name: f.name }))}
            inspections={inspections}
            canEdit={canEdit}
            preview={overview.mode === "pilot_preview"}
          />
        </div>
      )}
    </div>
  );
}
