import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listActionEvents } from "@/lib/workspace/agent/persist";
import { EmptyState, PilotBanner } from "../ui";
import { AuditTrailClient } from "./AuditTrailClient";

export const metadata: Metadata = { title: "Audit Trail" };

type HumanAuditRow = {
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

  let humanRows: HumanAuditRow[] = [];
  let agentEvents: Awaited<ReturnType<typeof listActionEvents>> = [];
  if (overview.mode === "live" && memberships[0]) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("workspace_audit_events")
      .select("id, actor_email, entity_type, entity_id, action, from_state, to_state, created_at")
      .eq("organization_id", memberships[0].organizationId)
      .order("created_at", { ascending: false })
      .limit(100);
    humanRows = (data ?? []) as HumanAuditRow[];
    try {
      agentEvents = await listActionEvents(supabase, memberships[0].organizationId);
    } catch {
      agentEvents = [];
    }
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Audit trail</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Human changes and agent actions. Agent rows show who authorized the run, tools used, supporting
        sources, the proposed diff, and whether approval was obtained.
      </p>

      {overview.mode === "pilot_preview" ? (
        <div className="mt-6">
          <EmptyState
            title="Audit trail unavailable in preview"
            body="After your organization is provisioned, create/update events appear here with actor email and state transitions. Agent actions include authorizer, tools, sources, and approval."
          />
        </div>
      ) : (
        <div className="mt-6">
          <AuditTrailClient humanRows={humanRows} agentEvents={agentEvents} />
        </div>
      )}
    </div>
  );
}
