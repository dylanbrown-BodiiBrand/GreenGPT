import type { Metadata } from "next";
import { requireWorkspaceUser } from "@/lib/workspace/requireWorkspaceUser";
import { getWorkspaceOverview } from "@/lib/workspace/queries";
import { EmptyState, PilotBanner } from "../ui";

export const metadata: Metadata = { title: "Facilities" };

export default async function FacilitiesPage() {
  const user = await requireWorkspaceUser();
  const data = await getWorkspaceOverview(user);

  return (
    <div>
      <PilotBanner mode={data.mode} />
      <h2 className="text-2xl font-semibold text-[#0B3D2E]">Facilities</h2>
      <p className="mt-1 text-sm text-[#374944]">Site profiles used for obligations, actions, and Ask context.</p>

      {data.facilities.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No facilities provisioned"
            body="After your diagnostic, GreenGPT Advisory adds facility records to your organization. Self-serve creation is not enabled in this phase."
            href="/intake"
            cta="Request a diagnostic"
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {data.facilities.map((f) => (
            <li key={f.id} className="rounded-xl border border-[#E8E6E0] bg-white p-5">
              <div className="text-lg font-semibold text-[#0B3D2E]">{f.name}</div>
              <div className="mt-2 text-sm text-[#374944]">
                {[f.state, f.industry, f.employee_count].filter(Boolean).join(" · ") || "Profile pending"}
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#059669]">{f.status}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
