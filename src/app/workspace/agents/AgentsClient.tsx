"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentPrincipal } from "@/lib/workspace/agent/types";

export function AgentsClient({
  agents,
  facilities,
  canManage,
}: {
  agents: AgentPrincipal[];
  facilities: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(agents);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("No longer authorized for this organization.");

  const provision = async () => {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "GreenGPT Compliance Agent" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to create agent.");
      setRows((prev) => [...prev, data.agent]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create agent.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (agentId: string) => {
    if (!canManage) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to revoke agent.");
      setRows((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, status: "revoked", revokeReason: reason } : a))
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke agent.");
    } finally {
      setBusy(false);
    }
  };

  const facilityLabel = (ids: string[] | null) => {
    if (!ids) return "All facilities in organization";
    return ids.map((id) => facilities.find((f) => f.id === id)?.name ?? id.slice(0, 8)).join(", ");
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {canManage && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[#E8E6E0] bg-white p-4">
          <button
            type="button"
            onClick={provision}
            disabled={busy}
            className="rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a3326] disabled:opacity-50"
          >
            {busy ? "Working…" : "Provision compliance agent"}
          </button>
          <label className="flex min-w-[16rem] flex-1 flex-col text-xs font-semibold text-[#374944]">
            Revocation reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm font-normal text-black"
            />
          </label>
        </div>
      )}

      {!canManage && (
        <p className="text-sm text-[#6B7280]">Only an EHS manager can create or revoke org-wide agents.</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-[#6B7280]">No agents provisioned yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E6E0] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#E8E6E0] bg-[#F8FAF9] text-xs uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Delegated by</th>
                <th className="px-4 py-3">Capabilities</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((agent) => (
                <tr key={agent.id} className="border-b border-[#F3F4F6] last:border-0">
                  <td className="px-4 py-3 font-medium text-[#1B2A22]">{agent.name}</td>
                  <td className="px-4 py-3 capitalize text-[#374944]">{agent.status}</td>
                  <td className="px-4 py-3 text-[#374944]">{facilityLabel(agent.facilityIds)}</td>
                  <td className="px-4 py-3 text-[#374944]">{agent.delegatedByEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#374944]">{agent.capabilities.join(", ")}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage && agent.status === "active" && (
                      <button
                        type="button"
                        onClick={() => revoke(agent.id)}
                        disabled={busy}
                        className="text-sm font-semibold text-red-800 hover:underline disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
