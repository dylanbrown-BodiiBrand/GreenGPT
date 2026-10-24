import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { canApproveAgentProposals, mapOrgRoleToJobFunction } from "@/lib/workspace/roles";
import { AskWorkspaceClient } from "./AskWorkspaceClient";
import { PilotBanner } from "../ui";

export const metadata: Metadata = {
  title: "Ask GreenGPT",
  description: "Facility- and source-aware EHS assistant. Draft answers only until human review.",
};

export default async function AskPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);
  const canRunAgent = memberships[0]
    ? canApproveAgentProposals(mapOrgRoleToJobFunction(memberships[0].role))
    : false;
  const facilities =
    overview.facilities.length > 0
      ? overview.facilities.map((f) => ({
          id: f.id,
          name: f.name,
          preview: overview.mode === "pilot_preview",
        }))
      : [{ id: "preview-fac-1", name: "Sample facility", preview: true }];

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Ask GreenGPT</h2>
      <p className="mt-1 max-w-3xl text-sm text-[#374944]">
        Source-grounded drafts for facility questions. Retrieval is logged to the agent ledger. Use only approved
        documents. Unsupported answers are declined or clearly flagged. Consequential writes still require human
        approval.
      </p>
      <div className="mt-6">
        <AskWorkspaceClient facilities={facilities} mode={overview.mode} canRunAgent={canRunAgent} />
      </div>
    </div>
  );
}
