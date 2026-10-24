"use client";

import { useState } from "react";
import Link from "next/link";

export function OverviewAgentActions({
  facilities,
  canRunAgent,
  pendingCount,
}: {
  facilities: { id: string; name: string }[];
  canRunAgent: boolean;
  pendingCount: number;
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!canRunAgent || !facilityId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/workspace/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId,
          trigger: "overview_deadlines",
          tools: ["identify_deadlines", "propose_tasks", "prepare_records"],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Agent run failed.");
      setMessage(
        `${Number(data.proposalCount ?? 0)} proposal(s) queued for approval. The agent did not write records.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-[#E8E6E0] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">
            Approval-controlled agent
          </h3>
          <p className="mt-1 text-sm text-[#374944]">
            Identify deadlines, propose tasks, and prepare records as drafts. A named human must authorize any
            write. {pendingCount} pending approval{pendingCount === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/workspace/approvals" className="text-sm font-semibold text-[#0B3D2E] underline">
          Open approvals →
        </Link>
      </div>
      {canRunAgent && facilities.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-[#374944]">
            Facility
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="mt-1 block rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm font-normal text-black"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a3326] disabled:opacity-50"
          >
            {busy ? "Running…" : "Review upcoming deadlines"}
          </button>
        </div>
      )}
      {message && <p className="mt-3 text-sm text-[#0B3D2E]">{message}</p>}
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
