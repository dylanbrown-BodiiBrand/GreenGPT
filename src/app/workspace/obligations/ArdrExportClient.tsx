"use client";

import { useMemo, useState } from "react";

type Facility = { id: string; name: string };

export function ArdrExportClient({
  facilities,
  preview,
}: {
  facilities: Facility[];
  preview: boolean;
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedName = useMemo(
    () => facilities.find((f) => f.id === facilityId)?.name ?? "facility",
    [facilities, facilityId]
  );

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = preview
        ? "/api/workspace/ardr/export?preview=1"
        : `/api/workspace/ardr/export?facilityId=${encodeURIComponent(facilityId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed.");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        `GreenGPT-ARDR-${selectedName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-[#E8E6E0] bg-[#F8FAF9] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[#059669]">ARDR export</h3>
      <p className="mt-2 text-sm text-[#374944]">
        Download an Applicable Regulations &amp; Document Review (.xlsx) snapshot. The workspace stays the system of
        record for status, evidence, and CAPs — re-export when you need a client or walkdown pack.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {!preview && facilities.length > 1 ? (
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

        <button
          type="button"
          onClick={download}
          disabled={busy || (!preview && !facilityId)}
          className="rounded-lg bg-[#0B3D2E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Exporting…" : preview ? "Export sample ARDR" : "Export ARDR (.xlsx)"}
        </button>

        <a
          href="/templates/GreenGPT-ARDR-Facility-Template.xlsx"
          className="text-sm font-semibold text-[#0B3D2E] underline-offset-2 hover:underline"
        >
          Blank ARDR template
        </a>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {preview ? (
        <p className="mt-3 text-xs text-[#6B7280]">
          Pilot preview exports sample rows only. Live facility exports require a provisioned organization.
        </p>
      ) : null}
    </div>
  );
}
