import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAgents } from "@/lib/workspace/agent/persist";
import { mapOrgRoleToJobFunction } from "@/lib/workspace/roles";
import { EmptyState, PilotBanner } from "../ui";
import { AgentsClient } from "./AgentsClient";

export const metadata: Metadata = { title: "Agents" };

export default async function AgentsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);
  const membership = memberships[0];
  const jobFunction = membership ? mapOrgRoleToJobFunction(membership.role) : "employee";

  let agents: Awaited<ReturnType<typeof listAgents>> = [];
  if (overview.mode === "live" && membership) {
    const supabase = await createSupabaseServerClient();
    try {
      agents = await listAgents(supabase, membership.organizationId);
    } catch {
      agents = [];
    }
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Agent identity</h2>
      <p className="mt-1 max-w-3xl text-sm text-[#374944]">
        Named, scoped, revocable principals. Automated actions run as an agent — not as a shared job secret
        and not as the person who clicked Ask. Your job function:{" "}
        <strong>{jobFunction.replaceAll("_", " ")}</strong>.
      </p>

      {overview.mode === "pilot_preview" ? (
        <div className="mt-6">
          <EmptyState
            title="Agents unavailable in preview"
            body="After your organization is provisioned, an EHS manager can create the GreenGPT Compliance Agent and revoke it at any time."
          />
        </div>
      ) : (
        <div className="mt-6">
          <AgentsClient
            agents={agents}
            facilities={overview.facilities.map((f) => ({ id: f.id, name: f.name }))}
            canManage={jobFunction === "ehs_manager"}
          />
        </div>
      )}
    </div>
  );
}
