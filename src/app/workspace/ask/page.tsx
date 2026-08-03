import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { AskWorkspaceClient } from "./AskWorkspaceClient";
import { PilotBanner } from "../ui";

export const metadata: Metadata = {
  title: "Ask GreenGPT",
  description: "Facility- and source-aware EHS assistant. Draft answers only until human review.",
};

export default async function AskPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
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
        Source-grounded drafts for facility questions. Use only approved documents. Unsupported answers are declined
        or clearly flagged. Your EHS team remains the decision owner.
      </p>
      <div className="mt-6">
        <AskWorkspaceClient facilities={facilities} mode={overview.mode} />
      </div>
    </div>
  );
}
