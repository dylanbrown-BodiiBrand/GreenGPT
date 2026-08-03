import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { PILOT_PREVIEW } from "@/lib/workspace/sampleWorkspace";
import type { ObligationRow } from "@/lib/workspace/types";
import { EmptyState, PilotBanner, ReviewBadge } from "../ui";

export const metadata: Metadata = { title: "Obligations" };

export default async function ObligationsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  let rows: ObligationRow[] = overview.upcomingObligations;

  if (overview.mode === "live") {
    const memberships = await listMembershipsForUser(user);
    if (memberships[0]) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("obligations")
        .select(
          "id, organization_id, facility_id, title, source_document, source_citation, jurisdiction, frequency, owner_name, evidence_required, status, review_state, next_due_at, notes"
        )
        .eq("organization_id", memberships[0].organizationId)
        .order("next_due_at", { ascending: true, nullsFirst: false })
        .limit(50);
      rows = (data ?? []) as ObligationRow[];
    }
  } else {
    rows = PILOT_PREVIEW.upcomingObligations;
  }

  const facilityName = (id: string) =>
    overview.facilities.find((f) => f.id === id)?.name ?? "Facility";

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Obligation register</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Source-linked requirements with owners, due dates, and review state. AI-extracted rows stay drafts until
        approved.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No obligations yet"
            body="Obligation registers are created during diagnostic / managed onboarding. This list is membership-scoped and not publicly readable."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E8E6E0] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E8E6E0] bg-[#F8FAF9] text-xs uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Obligation</th>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Next due</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-[#F3F4F6] last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1B2A22]">{o.title}</div>
                    <div className="text-xs text-[#6B7280]">
                      {o.source_citation ?? "—"} · {o.frequency ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#374944]">{facilityName(o.facility_id)}</td>
                  <td className="px-4 py-3 text-[#374944]">{o.next_due_at ?? "—"}</td>
                  <td className="px-4 py-3 text-[#374944]">{o.owner_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ReviewBadge state={o.review_state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
