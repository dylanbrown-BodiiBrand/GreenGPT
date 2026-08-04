"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BriefingContent } from "@/lib/workspace/briefingBuilder";
import type { ReviewState } from "@/lib/workspace/types";
import { ReviewBadge } from "../ui";

type Facility = { id: string; name: string };
type Briefing = {
  id: string;
  title: string;
  period_label: string;
  review_state: ReviewState;
  content: BriefingContent;
  created_at: string;
  reviewer_name: string | null;
};

export function BriefingsClient({
  facilities,
  briefings,
  canEdit,
  preview,
}: {
  facilities: Facility[];
  briefings: Briefing[];
  canEdit: boolean;
  preview: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(briefings);
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/briefings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facilityId: facilityId || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Generate failed.");
      setRows((prev) => [data.briefing, ...prev]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate failed.");
    } finally {
      setBusy(false);
    }
  };

  const setReview = async (id: string, reviewState: ReviewState) => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/briefings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reviewState }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Review update failed.");
      setRows((prev) => prev.map((r) => (r.id === id ? data.briefing : r)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && !preview && (
        <section className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">
            Generate draft monthly briefing
          </h3>
          <p className="mt-2 text-sm text-[#374944]">
            Assembles upcoming obligations, open actions, and missing evidence into a draft for EHS review.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Facility (optional filter)</span>
              <select
                className="rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
              >
                <option value="">All facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void generate()}
              className="rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate draft"}
            </button>
          </div>
        </section>
      )}

      {preview && (
        <p className="text-sm text-amber-900">
          Live briefing generation requires a provisioned organization. Use the representative sample below.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {rows.map((b) => {
        const c = b.content;
        return (
          <article key={b.id} className="rounded-xl border border-[#E8E6E0] bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[#0B3D2E]">{b.title}</h3>
              <ReviewBadge state={b.review_state} />
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              {b.period_label} · created {new Date(b.created_at).toLocaleString()}
              {b.reviewer_name ? ` · reviewer ${b.reviewer_name}` : ""}
            </p>
            <p className="mt-3 text-sm text-[#374944]">{c.disclaimer}</p>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <h4 className="text-xs font-semibold uppercase text-[#059669]">Upcoming obligations</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {(c.upcomingObligations ?? []).length === 0 && (
                    <li className="text-[#6B7280]">None in window</li>
                  )}
                  {(c.upcomingObligations ?? []).map((o, i) => (
                    <li key={`${o.title}-${i}`}>
                      {o.title} <span className="text-xs text-[#6B7280]">· {o.nextDue ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase text-[#059669]">Open actions</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {(c.openActions ?? []).length === 0 && <li className="text-[#6B7280]">None open</li>}
                  {(c.openActions ?? []).map((a, i) => (
                    <li key={`${a.finding}-${i}`}>
                      {a.finding}{" "}
                      <span className="text-xs text-[#6B7280]">
                        · {a.status.replace(/_/g, " ")} · {a.dueDate ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase text-[#059669]">Management attention</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {(c.managementAttention ?? []).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <h4 className="mt-4 text-xs font-semibold uppercase text-[#059669]">Missing evidence</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  {(c.missingEvidence ?? []).length === 0 && (
                    <li className="text-[#6B7280]">None flagged</li>
                  )}
                  {(c.missingEvidence ?? []).map((e, i) => (
                    <li key={`${e.title}-${i}`}>{e.title}</li>
                  ))}
                </ul>
              </div>
            </div>

            {canEdit && !preview && (
              <div className="mt-4 flex flex-wrap gap-2">
                {(["draft", "reviewed", "approved", "needs_clarification"] as ReviewState[]).map((state) => (
                  <button
                    key={state}
                    type="button"
                    disabled={busy || b.review_state === state}
                    onClick={() => void setReview(b.id, state)}
                    className="rounded-lg border border-[#D1D5DB] px-3 py-1 text-xs font-semibold capitalize text-[#0B3D2E] disabled:opacity-40"
                  >
                    Mark {state.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
