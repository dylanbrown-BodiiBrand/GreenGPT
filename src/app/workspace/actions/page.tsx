import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { PILOT_PREVIEW } from "@/lib/workspace/sampleWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CorrectiveActionRow } from "@/lib/workspace/types";
import { EmptyState, PilotBanner } from "../ui";

export const metadata: Metadata = { title: "Corrective Actions" };

export default async function ActionsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  let rows: CorrectiveActionRow[] = [];

  if (overview.mode === "pilot_preview") {
    rows = [...PILOT_PREVIEW.overdueActions, ...PILOT_PREVIEW.awaitingReview];
  } else {
    const memberships = await listMembershipsForUser(user);
    if (memberships[0]) {
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
  }

  const facilityName = (id: string) =>
    overview.facilities.find((f) => f.id === id)?.name ?? "Facility";

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Corrective actions</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Findings with owners, due dates, evidence requirements, and status. Nothing is closed without review.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No corrective actions"
            body="Actions appear here when inspection findings or follow-ups are tracked for your organization."
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((a) => (
            <li key={a.id} className="rounded-xl border border-[#E8E6E0] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-[#1B2A22]">{a.finding}</div>
                  <div className="mt-1 text-sm text-[#374944]">{a.description}</div>
                </div>
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold uppercase text-[#065F46]">
                  {a.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-[#6B7280] sm:grid-cols-2 lg:grid-cols-4">
                <div>Facility: {facilityName(a.facility_id)}</div>
                <div>Owner: {a.owner_name ?? "—"}</div>
                <div>Due: {a.due_date ?? "—"}</div>
                <div>Priority: {a.priority}</div>
                <div className="sm:col-span-2">Evidence: {a.evidence_required ?? "—"}</div>
                <div className="sm:col-span-2">Sources: {a.source_references ?? "—"}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
