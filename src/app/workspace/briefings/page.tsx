import type { Metadata } from "next";
import Link from "next/link";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { EmptyState, PilotBanner, ReviewBadge } from "../ui";

export const metadata: Metadata = { title: "Briefings" };

export default async function BriefingsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Monthly compliance briefings</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Leadership-ready summaries of obligations, actions, and evidence gaps. Live briefings are delivered under
        managed engagements.
      </p>

      <div className="mt-6 space-y-4">
        <article className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-[#0B3D2E]">Representative sample briefing</h3>
            <ReviewBadge state="draft" />
          </div>
          <p className="mt-2 text-sm text-[#374944]">
            Illustrative July 2026 briefing for a sample chemical manufacturing facility. Not a live client record.
          </p>
          <Link
            href="/briefing/demo"
            className="mt-4 inline-flex rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a3326]"
          >
            Open sample briefing
          </Link>
        </article>

        {!overview.latestBriefingLabel && (
          <EmptyState
            title="No live briefings yet"
            body="When your managed cadence starts, monthly briefings will list here with draft → reviewed → approved states."
          />
        )}
      </div>
    </div>
  );
}
