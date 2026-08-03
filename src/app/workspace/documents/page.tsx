import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { PILOT_PREVIEW } from "@/lib/workspace/sampleWorkspace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceDocumentRow } from "@/lib/workspace/types";
import { EmptyState, PilotBanner, ReviewBadge } from "../ui";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  let rows: WorkspaceDocumentRow[] = overview.recentDocuments;

  if (overview.mode === "pilot_preview") {
    rows = PILOT_PREVIEW.recentDocuments;
  } else {
    const memberships = await listMembershipsForUser(user);
    if (memberships[0]) {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from("workspace_documents")
        .select("id, organization_id, facility_id, title, doc_type, approval_status, notes")
        .eq("organization_id", memberships[0].organizationId)
        .order("updated_at", { ascending: false })
        .limit(50);
      rows = (data ?? []) as WorkspaceDocumentRow[];
    }
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Approved document library</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Client-approved sources for the workspace assistant. Unapproved materials should not ground answers.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No documents yet"
            body="During a pilot or managed engagement, GreenGPT Advisory ingests client-approved (or redacted) materials into your organization library."
            href="/intake"
            cta="Discuss document intake"
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E8E6E0] bg-white px-5 py-4"
            >
              <div>
                <div className="font-medium text-[#1B2A22]">{d.title}</div>
                <div className="text-xs text-[#6B7280]">{d.doc_type ?? "Document"} · {d.notes ?? ""}</div>
              </div>
              <ReviewBadge state={d.approval_status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
