import type { Metadata } from "next";
import Link from "next/link";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { canEditWorkspace } from "@/lib/workspace/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BriefingContent } from "@/lib/workspace/briefingBuilder";
import type { ReviewState } from "@/lib/workspace/types";
import { PilotBanner, ReviewBadge } from "../ui";
import { BriefingsClient } from "./BriefingsClient";

export const metadata: Metadata = { title: "Briefings" };

type BriefingRow = {
  id: string;
  title: string;
  period_label: string;
  review_state: ReviewState;
  content: BriefingContent;
  created_at: string;
  reviewer_name: string | null;
};

export default async function BriefingsPage() {
  const user = await requireWorkspaceUser();
  const overview = await getWorkspaceOverview(user);
  const memberships = await listMembershipsForUser(user);
  const canEdit = memberships[0] ? canEditWorkspace(memberships[0].role) : false;

  let briefings: BriefingRow[] = [];
  if (overview.mode === "live" && memberships[0]) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("compliance_briefings")
      .select("id, title, period_label, review_state, content, created_at, reviewer_name")
      .eq("organization_id", memberships[0].organizationId)
      .order("created_at", { ascending: false })
      .limit(20);
    briefings = (data ?? []) as BriefingRow[];
  }

  return (
    <div>
      <PilotBanner mode={overview.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Monthly compliance briefings</h2>
      <p className="mt-1 text-sm text-[#374944]">
        Draft briefings assemble obligations, actions, and evidence gaps. Review states are explicit and audited.
      </p>

      <div className="mt-6 space-y-4">
        <article className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-[#0B3D2E]">Representative sample briefing</h3>
            <ReviewBadge state="draft" />
          </div>
          <p className="mt-2 text-sm text-[#374944]">
            Illustrative sample for sales/demo. Not a live client record.
          </p>
          <Link
            href="/briefing/demo"
            className="mt-4 inline-flex rounded-lg border-2 border-[#0B3D2E] px-4 py-2 text-sm font-semibold text-[#0B3D2E]"
          >
            Open sample briefing
          </Link>
        </article>

        <BriefingsClient
          facilities={overview.facilities.map((f) => ({ id: f.id, name: f.name }))}
          briefings={briefings}
          canEdit={canEdit}
          preview={overview.mode === "pilot_preview"}
        />
      </div>
    </div>
  );
}
