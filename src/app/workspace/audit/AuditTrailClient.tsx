"use client";

import { useState } from "react";
import type { AgentActionEvent } from "@/lib/workspace/agent/types";

type HumanAuditRow = {
  id: number;
  actor_email: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  from_state: string | null;
  to_state: string | null;
  created_at: string;
};

export function AuditTrailClient({
  humanRows,
  agentEvents,
}: {
  humanRows: HumanAuditRow[];
  agentEvents: AgentActionEvent[];
}) {
  const [view, setView] = useState<"human" | "agent">("agent");

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setView("agent")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            view === "agent" ? "bg-[#ECFDF5] text-[#0B3D2E]" : "text-[#374944] hover:bg-[#F5F5F0]"
          }`}
        >
          Agent actions ({agentEvents.length})
        </button>
        <button
          type="button"
          onClick={() => setView("human")}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            view === "human" ? "bg-[#ECFDF5] text-[#0B3D2E]" : "text-[#374944] hover:bg-[#F5F5F0]"
          }`}
        >
          Human changes ({humanRows.length})
        </button>
      </div>

      {view === "human" ? <HumanTable rows={humanRows} /> : <AgentTable events={agentEvents} />}
    </div>
  );
}

function HumanTable({ rows }: { rows: HumanAuditRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-[#6B7280]">No human change events yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8E6E0] bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[#E8E6E0] bg-[#F8FAF9] text-xs uppercase tracking-wide text-[#6B7280]">
          <tr>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Actor</th>
            <th className="px-4 py-3">Entity</th>
            <th className="px-4 py-3">Action</th>
            <th className="px-4 py-3">State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[#F3F4F6] last:border-0">
              <td className="px-4 py-3 text-[#374944]">{new Date(r.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-[#1B2A22]">{r.actor_email}</td>
              <td className="px-4 py-3 text-[#374944]">
                {r.entity_type}
                {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ""}
              </td>
              <td className="px-4 py-3 text-[#374944]">{r.action}</td>
              <td className="px-4 py-3 text-[#374944]">
                {(r.from_state ?? "—") + " → " + (r.to_state ?? "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentTable({ events }: { events: AgentActionEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[#6B7280]">
        No agent action events yet. Ask retrievals and proposal tools appear here with sources and approval
        status.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article key={event.id} className="rounded-xl border border-[#E8E6E0] bg-white p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#0B3D2E]">{event.toolName}</p>
            <p className="text-xs uppercase tracking-wide text-[#6B7280]">{event.approvalStatus}</p>
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">{new Date(event.createdAt).toLocaleString()}</p>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Agent</dt>
              <dd className="text-[#374944]">{event.agentId.slice(0, 8)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Authorized by</dt>
              <dd className="text-[#374944]">{event.authorizedByEmail ?? "Pending / not required"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Sources</dt>
              <dd className="text-[#374944]">
                {event.supportingSources
                  .map((s) => [s.filename, s.citation, s.excerpt].filter(Boolean).join(" — "))
                  .join("; ") || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Proposed change</dt>
              <dd>
                <pre className="mt-1 overflow-x-auto rounded bg-[#F8FAF9] p-2 text-xs text-[#1B2A22]">
                  {JSON.stringify(event.proposedChange, null, 2)}
                </pre>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Applied</dt>
              <dd className="text-[#374944]">
                {event.appliedEntityType
                  ? `${event.appliedEntityType} · ${event.appliedEntityIds.join(", ") || "none"}`
                  : "No entity write"}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
