import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPendingProposals } from "@/lib/workspace/agent/persist";
import { canApproveAgentProposals, mapOrgRoleToJobFunction } from "@/lib/workspace/roles";
import { EmptyState, PilotBanner } from "../ui";
import { ApprovalsClient } from "./ApprovalsClient";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);
  const membership = memberships[0];
  const jobFunction = membership ? mapOrgRoleToJobFunction(membership.role) : "employee";
  const canApprove = membership ? canApproveAgentProposals(jobFunction) : false;

  let proposals: Awaited<ReturnType<typeof listPendingProposals>> = [];
  if (overview.mode === "live" && membership) {
    const supabase = await createSupabaseServerClient();
    try {
      proposals = await listPendingProposals(supabase, membership.organizationId);
    } catch {
      proposals = [];
    }
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Agent approvals</h2>
      <p className="mt-1 max-w-3xl text-sm text-[#374944]">
        Review source-backed diffs before any consequential write. The agent cannot approve its own proposals.
        Employees cannot approve.
      </p>

      {overview.mode === "pilot_preview" ? (
        <div className="mt-6">
          <EmptyState
            title="Approvals unavailable in preview"
            body="After provisioning, deadline alerts, corrective-action drafts, and prepared records wait here."
          />
        </div>
      ) : (
        <div className="mt-6">
          <ApprovalsClient
            proposals={proposals}
            canApprove={canApprove}
            facilities={overview.facilities.map((f) => ({ id: f.id, name: f.name }))}
          />
        </div>
      )}
    </div>
  );
}
