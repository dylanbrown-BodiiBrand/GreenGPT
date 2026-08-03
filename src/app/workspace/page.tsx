import type { Metadata } from "next";
import Link from "next/link";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { EmptyState, PilotBanner, ReviewBadge, StatCard } from "./ui";

export const metadata: Metadata = {
  title: "Workspace Overview",
  description: "Managed EHS Workspace overview — obligations, actions, evidence, and briefings.",
};

export default async function WorkspaceOverviewPage() {
  const user = await requireWorkspaceUser("/workspace");
  const data = await getWorkspaceOverview(user);

  return (
    <div>
      <PilotBanner mode={data.mode} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#0B3D2E]">Overview</h2>
          <p className="mt-1 text-sm text-[#374944]">
            {data.organizationName ?? "No organization yet"} · operational visibility for your facilities
          </p>
        </div>
        <Link href="/workspace/ask" className="text-sm font-semibold text-[#0B3D2E] underline">
          Ask GreenGPT →
        </Link>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Facilities" value={data.facilities.length} />
        <StatCard label="Upcoming obligations" value={data.upcomingObligations.length} hint="Next 30 days" />
        <StatCard label="Overdue actions" value={data.overdueActions.length} />
        <StatCard label="Missing evidence" value={data.missingEvidence.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">Upcoming obligations</h3>
          {data.upcomingObligations.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No upcoming obligations in the next 30 days.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {data.upcomingObligations.map((o) => (
                <li key={o.id} className="border-b border-[#F3F4F6] pb-3 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#1B2A22]">{o.title}</span>
                    <ReviewBadge state={o.review_state} />
                  </div>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    Due {o.next_due_at ?? "—"} · {o.source_citation ?? "No citation"} · Owner {o.owner_name ?? "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/workspace/obligations" className="mt-4 inline-block text-sm font-semibold text-[#0B3D2E]">
            View obligations →
          </Link>
        </section>

        <section className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">Actions needing attention</h3>
          {[...data.overdueActions, ...data.awaitingReview].length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No open corrective actions requiring attention.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {[...data.overdueActions, ...data.awaitingReview].slice(0, 6).map((a) => (
                <li key={a.id} className="border-b border-[#F3F4F6] pb-3 last:border-0">
                  <div className="font-medium text-[#1B2A22]">{a.finding}</div>
                  <div className="mt-1 text-xs text-[#6B7280]">
                    {a.status.replace(/_/g, " ")} · Due {a.due_date ?? "—"} · {a.priority} priority
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/workspace/actions" className="mt-4 inline-block text-sm font-semibold text-[#0B3D2E]">
            View actions →
          </Link>
        </section>

        <section className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">Missing evidence</h3>
          {data.missingEvidence.length === 0 ? (
            <p className="mt-3 text-sm text-[#6B7280]">No missing evidence items flagged.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.missingEvidence.map((e) => (
                <li key={e.id} className="text-sm text-[#1B2A22]">
                  {e.title}
                  <span className="block text-xs text-[#6B7280]">{e.required_proof ?? "Proof required"}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/workspace/evidence" className="mt-4 inline-block text-sm font-semibold text-[#0B3D2E]">
            Evidence tracker →
          </Link>
        </section>

        <section className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">Latest briefing</h3>
          {data.latestBriefingLabel ? (
            <p className="mt-3 text-sm text-[#1B2A22]">{data.latestBriefingLabel}</p>
          ) : (
            <EmptyState
              title="No live briefing yet"
              body="Monthly briefings appear here after managed delivery. You can review a representative sample now."
              href="/briefing/demo"
              cta="View sample briefing"
            />
          )}
          <Link href="/workspace/briefings" className="mt-4 inline-block text-sm font-semibold text-[#0B3D2E]">
            Briefings →
          </Link>
        </section>
      </div>
    </div>
  );
}
