"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CorrectiveActionStatus } from "@/lib/workspace/types";

const STATUSES: CorrectiveActionStatus[] = [
  "open",
  "in_progress",
  "awaiting_evidence",
  "awaiting_review",
  "closed",
];

type Facility = { id: string; name: string };
type Action = {
  id: string;
  facility_id: string;
  finding: string;
  description: string | null;
  owner_name: string | null;
  due_date: string | null;
  priority: string;
  evidence_required: string | null;
  evidence_link: string | null;
  status: CorrectiveActionStatus;
  source_references?: string | null;
};

export function ActionsClient({
  facilities,
  actions,
  canEdit,
  preview,
}: {
  facilities: Facility[];
  actions: Action[];
  canEdit: boolean;
  preview: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(actions);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    facilityId: facilities[0]?.id ?? "",
    finding: "",
    description: "",
    ownerName: "",
    dueDate: "",
    priority: "medium",
    evidenceRequired: "",
    sourceReferences: "",
  });

  const facilityName = useMemo(() => {
    const map = new Map(facilities.map((f) => [f.id, f.name]));
    return (id: string) => map.get(id) ?? "Facility";
  }, [facilities]);

  const createAction = async () => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Create failed.");
      setRows((prev) => [data.action, ...prev]);
      setForm((f) => ({ ...f, finding: "", description: "", evidenceRequired: "", sourceReferences: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: string, status: CorrectiveActionStatus) => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setRows((prev) => prev.map((r) => (r.id === id ? data.action : r)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {canEdit && !preview && (
        <section className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">
            New corrective action
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
              <span className="mb-1 block font-medium">Priority</span>
              <select
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Finding</span>
              <input
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.finding}
                onChange={(e) => setForm((f) => ({ ...f, finding: e.target.value }))}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Description</span>
              <textarea
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Owner</span>
              <input
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.ownerName}
                onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Due date</span>
              <input
                type="date"
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Evidence required</span>
              <input
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.evidenceRequired}
                onChange={(e) => setForm((f) => ({ ...f, evidenceRequired: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Source references</span>
              <input
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.sourceReferences}
                onChange={(e) => setForm((f) => ({ ...f, sourceReferences: e.target.value }))}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !form.finding || !form.facilityId}
            onClick={() => void createAction()}
            className="mt-4 rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Create action"}
          </button>
        </section>
      )}

      {preview && (
        <p className="text-sm text-amber-900">
          Preview mode — create/update is disabled until your organization is provisioned.
        </p>
      )}
      {!canEdit && !preview && (
        <p className="text-sm text-[#6B7280]">Viewer role: status changes require editor access.</p>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="rounded-xl border border-[#E8E6E0] bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-[#1B2A22]">{a.finding}</div>
                <div className="mt-1 text-sm text-[#374944]">{a.description}</div>
              </div>
              {canEdit && !preview ? (
                <select
                  className="rounded-lg border border-[#D1D5DB] px-2 py-1 text-xs font-semibold uppercase text-black"
                  value={a.status}
                  disabled={busy}
                  onChange={(e) => void updateStatus(a.id, e.target.value as CorrectiveActionStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold uppercase text-[#065F46]">
                  {a.status.replace(/_/g, " ")}
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-2 text-xs text-[#6B7280] sm:grid-cols-2 lg:grid-cols-4">
              <div>Facility: {facilityName(a.facility_id)}</div>
              <div>Owner: {a.owner_name ?? "—"}</div>
              <div>Due: {a.due_date ?? "—"}</div>
              <div>Priority: {a.priority}</div>
              <div className="sm:col-span-2">Evidence: {a.evidence_required ?? "—"}</div>
              <div className="sm:col-span-2">Sources: {a.source_references ?? "—"}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
