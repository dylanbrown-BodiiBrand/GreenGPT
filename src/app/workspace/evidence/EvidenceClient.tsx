"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EvidenceStatus } from "@/lib/workspace/types";

const STATUSES: EvidenceStatus[] = ["missing", "uploaded", "reviewed", "audit_ready"];

type Facility = { id: string; name: string };
type Item = {
  id: string;
  title: string;
  required_proof: string | null;
  status: EvidenceStatus;
  last_reviewed_at: string | null;
};

export function EvidenceClient({
  facilities,
  items,
  canEdit,
  preview,
}: {
  facilities: Facility[];
  items: Item[];
  canEdit: boolean;
  preview: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    facilityId: facilities[0]?.id ?? "",
    title: "",
    requiredProof: "",
  });

  const createItem = async () => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Create failed.");
      setRows((prev) => [data.evidence, ...prev]);
      setForm((f) => ({ ...f, title: "", requiredProof: "" }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: string, status: EvidenceStatus) => {
    if (preview || !canEdit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed.");
      setRows((prev) => prev.map((r) => (r.id === id ? data.evidence : r)));
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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">Add evidence requirement</h3>
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
              <span className="mb-1 block font-medium">Required proof</span>
              <input
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.requiredProof}
                onChange={(e) => setForm((f) => ({ ...f, requiredProof: e.target.value }))}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Title</span>
              <input
                className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-black"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !form.title || !form.facilityId}
            onClick={() => void createItem()}
            className="mt-4 rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Add evidence item"}
          </button>
        </section>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E8E6E0] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#E8E6E0] bg-[#F8FAF9] text-xs uppercase tracking-wide text-[#6B7280]">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Required proof</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last reviewed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="border-b border-[#F3F4F6] last:border-0">
                <td className="px-4 py-3 font-medium text-[#1B2A22]">{e.title}</td>
                <td className="px-4 py-3 text-[#374944]">{e.required_proof ?? "—"}</td>
                <td className="px-4 py-3">
                  {canEdit && !preview ? (
                    <select
                      className="rounded border border-[#D1D5DB] px-2 py-1 text-xs capitalize text-black"
                      value={e.status}
                      disabled={busy}
                      onChange={(ev) => void updateStatus(e.id, ev.target.value as EvidenceStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="capitalize">{e.status.replace(/_/g, " ")}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#374944]">{e.last_reviewed_at ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
