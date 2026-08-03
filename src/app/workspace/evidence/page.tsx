import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { PILOT_PREVIEW } from "@/lib/workspace/sampleWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EvidenceItemRow } from "@/lib/workspace/types";
import { EmptyState, PilotBanner } from "../ui";

export const metadata: Metadata = { title: "Evidence" };

export default async function EvidencePage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  let rows: EvidenceItemRow[] = overview.missingEvidence;

  if (overview.mode === "pilot_preview") {
    rows = PILOT_PREVIEW.missingEvidence;
  } else {
    const memberships = await listMembershipsForUser(user);
    if (memberships[0]) {
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
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Evidence tracker</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Required proof, upload status, and audit-ready state for obligations and corrective actions.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No evidence items"
            body="Evidence requirements are linked during managed onboarding. Missing items will appear here for follow-up."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E8E6E0] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E8E6E0] bg-[#F8FAF9] text-xs uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Required proof</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last reviewed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-[#F3F4F6] last:border-0">
                  <td className="px-4 py-3 font-medium text-[#1B2A22]">{e.title}</td>
                  <td className="px-4 py-3 text-[#374944]">{e.required_proof ?? "—"}</td>
                  <td className="px-4 py-3 capitalize text-[#374944]">{e.status.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-[#374944]">{e.last_reviewed_at ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
