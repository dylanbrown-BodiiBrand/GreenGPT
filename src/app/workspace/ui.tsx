import Link from "next/link";
import type { ReviewState, WorkspaceOverview } from "@/lib/workspace/types";

export function PilotBanner({ mode }: { mode: WorkspaceOverview["mode"] }) {
  if (mode !== "pilot_preview") return null;
  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <strong>Pilot preview.</strong> No live organization membership was found for your account. Sample rows below
      illustrate the workspace. Ask GreenGPT Advisory to provision your facility records after a diagnostic.
    </div>
  );
}

export function ReviewBadge({ state }: { state: ReviewState | string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    reviewed: "bg-sky-100 text-sky-900",
    approved: "bg-emerald-100 text-emerald-900",
    needs_clarification: "bg-amber-100 text-amber-900",
    archived: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        styles[state] ?? styles.draft
      }`}
    >
      {String(state).replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-white px-5 py-8 text-center">
      <h3 className="text-base font-semibold text-[#0B3D2E]">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-[#374944]">{body}</p>
      {href && cta && (
        <Link
          href={href}
          className="mt-4 inline-flex rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a3326]"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-[#E8E6E0] bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[#0B3D2E]">{value}</div>
      {hint && <div className="mt-1 text-xs text-[#6B7280]">{hint}</div>}
    </div>
  );
}
