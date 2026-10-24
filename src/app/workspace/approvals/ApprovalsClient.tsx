"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentProposal } from "@/lib/workspace/agent/types";

export function ApprovalsClient({
  proposals,
  canApprove,
  facilities,
}: {
  proposals: AgentProposal[];
  canApprove: boolean;
  facilities: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(proposals);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const facilityName = (id: string | null) =>
    id ? facilities.find((f) => f.id === id)?.name ?? id.slice(0, 8) : "Organization";

  const decide = async (proposalId: string, decision: "approved" | "denied") => {
    if (!canApprove) return;
    setBusyId(proposalId);
    setError(null);
    try {
      const res = await fetch("/api/workspace/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Decision failed.");
      setRows((prev) => prev.filter((p) => p.id !== proposalId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (rows.length === 0) {
    return <p className="text-sm text-[#6B7280]">No pending agent proposals.</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {!canApprove && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          You can view proposals, but only an EHS manager or facility administrator may approve or deny them.
        </p>
      )}
      {rows.map((proposal) => (
        <article key={proposal.id} className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
                {proposal.kind.replace("_", " ")} · {facilityName(proposal.facilityId)}
              </p>
              <h3 className="mt-1 text-base font-semibold text-[#0B3D2E]">
                {String(proposal.payload.title ?? proposal.payload.finding ?? proposal.kind)}
              </h3>
            </div>
            {canApprove && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === proposal.id}
                  onClick={() => decide(proposal.id, "denied")}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Deny
                </button>
                <button
                  type="button"
                  disabled={busyId === proposal.id}
                  onClick={() => decide(proposal.id, "approved")}
                  className="rounded-lg bg-[#0B3D2E] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#0a3326] disabled:opacity-50"
                >
                  Approve draft
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Proposed change</h4>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-[#F8FAF9] p-3 text-xs text-[#1B2A22]">
                {JSON.stringify(proposal.proposedChange, null, 2)}
              </pre>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Supporting sources</h4>
              <ul className="mt-2 space-y-1 text-sm text-[#374944]">
                {proposal.supportingSources.map((source, i) => (
                  <li key={`${source.filename}-${i}`}>
                    {source.filename ?? "Source"}
                    {source.citation ? ` · ${source.citation}` : ""}
                    {source.excerpt ? ` — ${source.excerpt}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
