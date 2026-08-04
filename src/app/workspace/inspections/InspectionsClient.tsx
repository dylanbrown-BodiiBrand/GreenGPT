"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { defaultInspectionChecklist } from "@/lib/workspace/briefingBuilder";
import type { ReviewState } from "@/lib/workspace/types";
import { ReviewBadge } from "../ui";

type Facility = { id: string; name: string };
type ChecklistItem = { id: string; label: string; done: boolean; notes?: string };
type Inspection = {
  id: string;
  facility_id: string;
  title: string;
  inspection_type: string;
  scheduled_for: string | null;
  summary: string | null;
  checklist: ChecklistItem[];
  review_state: ReviewState;
};

export function InspectionsClient({
  facilities,
  inspections,
  canEdit,
  preview,
}: {
  facilities: Facility[];
  inspections: Inspection[];
  canEdit: boolean;
  preview: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(inspections);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    facilityId: facilities[0]?.id ?? "",
    title: "Facility inspection preparation",
    inspectionType: "facility",
    scheduledFor: "",
    summary: "",
  });

  const createInspection = async () => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          checklist: defaultInspectionChecklist(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Create failed.");
      setRows((prev) => [data.inspection, ...prev]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleItem = async (inspection: Inspection, itemId: string) => {
    if (preview || !canEdit) return;
    const checklist = inspection.checklist.map((c) =>
      c.id === itemId ? { ...c, done: !c.done } : c
    );
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/inspections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inspection.id, checklist }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setRows((prev) => prev.map((r) => (r.id === inspection.id ? data.inspection : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const setReview = async (id: string, reviewState: ReviewState) => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/inspections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reviewState }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Review update failed.");
      setRows((prev) => prev.map((r) => (r.id === id ? data.inspection : r)));
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
            New inspection preparation packet
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Facility</span>
              <select
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.facilityId}
                onChange={(e) => setForm((f) => ({ ...f, facilityId: e.target.value }))}
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Type</span>
              <select
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.inspectionType}
                onChange={(e) => setForm((f) => ({ ...f, inspectionType: e.target.value }))}
              >
                <option value="facility">Facility</option>
                <option value="regulatory">Regulatory</option>
                <option value="internal">Internal</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Title</span>
              <input
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Scheduled for</span>
              <input
                type="date"
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.scheduledFor}
                onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Summary / scope notes</span>
              <textarea
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                rows={2}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !form.facilityId || !form.title}
            onClick={() => void createInspection()}
            className="mt-4 rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Create draft prep packet"}
          </button>
        </section>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-[#6B7280]">No inspection prep packets yet.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((insp) => (
            <li key={insp.id} className="rounded-xl border border-[#E8E6E0] bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#0B3D2E]">{insp.title}</h3>
                <ReviewBadge state={insp.review_state} />
                <span className="text-xs text-[#6B7280]">
                  {insp.inspection_type} · {insp.scheduled_for ?? "unscheduled"}
                </span>
              </div>
              {insp.summary && <p className="mt-2 text-sm text-[#374944]">{insp.summary}</p>}
              <ul className="mt-4 space-y-2">
                {(insp.checklist ?? []).map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!item.done}
                      disabled={!canEdit || preview || busy}
                      onChange={() => void toggleItem(insp, item.id)}
                      className="mt-1"
                    />
                    <span className={item.done ? "text-[#6B7280] line-through" : "text-[#1B2A22]"}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
              {canEdit && !preview && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["draft", "reviewed", "approved", "needs_clarification"] as ReviewState[]).map((state) => (
                    <button
                      key={state}
                      type="button"
                      disabled={busy || insp.review_state === state}
                      onClick={() => void setReview(insp.id, state)}
                      className="rounded-lg border border-[#D1D5DB] px-3 py-1 text-xs font-semibold capitalize text-[#0B3D2E] disabled:opacity-40"
                    >
                      Mark {state.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
