"use client";

import { useState } from "react";
import Link from "next/link";

type Facility = { id: string; name: string };

export function ArdrImportClient({ facilities }: { facilities: Facility[] }) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const upload = async () => {
    if (!file || !facilityId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("facilityId", facilityId);
      form.append("file", file);
      const res = await fetch("/api/workspace/ardr/import", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Import failed.");
      setMessage(
        `${data.proposalCount} obligation proposal(s) from ${data.rowsRead} row(s). ` +
          `${data.notApplicable} marked No and ${data.notAssessed} not yet assessed were not imported. ` +
          "Nothing is in the register until approved."
      );
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-[#E8E6E0] bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">Populate from completed ARDR</h3>
      <p className="mt-2 text-sm text-[#374944]">
        Upload the facility&apos;s completed ARDR. GreenGPT proposes register rows for requirements marked Yes or TBD
        under Applies?; each one waits in Approvals with its citation and source row.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {facilities.length > 1 ? (
          <label className="text-sm text-[#374944]">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              Facility
            </span>
            <select
              className="rounded-lg border border-[#E8E6E0] bg-white px-3 py-2 text-sm"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-[#374944]"
        />

        <button
          type="button"
          onClick={upload}
          disabled={busy || !file || !facilityId}
          className="rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Preparing proposals…" : "Propose register rows"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="mt-3 text-sm text-[#0B3D2E]">
          {message}{" "}
          <Link href="/workspace/approvals" className="font-semibold underline">
            Review in Approvals →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
