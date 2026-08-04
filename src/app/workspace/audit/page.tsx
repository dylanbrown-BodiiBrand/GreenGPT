import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState, PilotBanner } from "../ui";

export const metadata: Metadata = { title: "Audit Trail" };

type AuditRow = {
  id: number;
  actor_email: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  from_state: string | null;
  to_state: string | null;
  created_at: string;
};

export default async function AuditPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);

  let rows: AuditRow[] = [];
  if (overview.mode === "live" && memberships[0]) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("workspace_audit_events")
      .select("id, actor_email, entity_type, entity_id, action, from_state, to_state, created_at")
      .eq("organization_id", memberships[0].organizationId)
      .order("created_at", { ascending: false })
      .limit(100);
    rows = (data ?? []) as AuditRow[];
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Audit trail</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Who created or changed actions, evidence, inspection prep, and briefing review states.
      </p>

      {overview.mode === "pilot_preview" ? (
        <div className="mt-6">
          <EmptyState
            title="Audit trail unavailable in preview"
            body="After your organization is provisioned, create/update events appear here with actor email and state transitions."
          />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No audit events yet"
            body="Events are recorded when editors create or update workspace records."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[#E8E6E0] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E8E6E0] bg-[#F8FAF9] text-xs uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#F3F4F6] last:border-0">
                  <td className="px-4 py-3 text-[#374944]">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-[#1B2A22]">{r.actor_email}</td>
                  <td className="px-4 py-3 text-[#374944]">
                    {r.entity_type}
                    {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-[#374944]">{r.action}</td>
                  <td className="px-4 py-3 text-[#374944]">
                    {(r.from_state ?? "—") + " → " + (r.to_state ?? "—")}
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
