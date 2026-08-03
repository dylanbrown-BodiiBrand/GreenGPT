"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import gfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { ReviewBadge } from "../ui";

type FacilityOption = { id: string; name: string; preview?: boolean };

type SourceRef = { documentId?: string; filename: string; score?: number };

type AskResult = {
  question: string;
  answer: string;
  reviewStatus: "draft" | "reviewed" | "approved";
  insufficientSources: boolean;
  sources: SourceRef[];
  facilityLabel: string | null;
  ts: number;
};

export function AskWorkspaceClient({
  facilities,
  mode,
}: {
  facilities: FacilityOption[];
  mode: "live" | "pilot_preview";
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId && facilities[0]) setFacilityId(facilities[0].id);
  }, [facilities, facilityId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    const asked = question.trim();
    setQuestion("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: asked,
          facilityId: facilityId.startsWith("preview-") ? null : facilityId || null,
          facilityLabel: facilities.find((f) => f.id === facilityId)?.name ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || "Ask failed.");

      setCurrent({
        question: asked,
        answer: data.answer || "No response.",
        reviewStatus: "draft",
        insufficientSources: !!data.insufficientSources,
        sources: Array.isArray(data.sources) ? data.sources : [],
        facilityLabel: data.facilityLabel ?? facilities.find((f) => f.id === facilityId)?.name ?? null,
        ts: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {mode === "pilot_preview" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Facility selector shows a preview site. Answers still require approved sources — without them, GreenGPT will
          decline rather than invent regulatory claims.
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-[#E8E6E0] bg-white p-5">
        <div>
          <label htmlFor="facility" className="mb-1 block text-sm font-semibold text-[#0B3D2E]">
            Facility context
          </label>
          <select
            id="facility"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
          >
            {facilities.length === 0 && <option value="">No facilities available</option>}
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.preview ? " (preview)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="question" className="mb-1 block text-sm font-semibold text-[#0B3D2E]">
            Question
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            placeholder="Ask about an approved plan, permit condition, or inspection checklist for this facility…"
            className="w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-emerald-600/40"
          />
        </div>

        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="rounded-lg bg-[#0B3D2E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a3326] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Searching approved sources…" : "Ask GreenGPT"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {current && (
        <article className="rounded-xl border border-[#E8E6E0] bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <ReviewBadge state={current.reviewStatus} />
            <span className="text-xs text-[#6B7280]">
              Requires EHS review · not legal advice
              {current.facilityLabel ? ` · ${current.facilityLabel}` : ""}
            </span>
          </div>
          <p className="font-semibold text-[#0B3D2E]">Q: {current.question}</p>

          {current.insufficientSources && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Approved sources were insufficient for a grounded answer.
            </div>
          )}

          <div className="prose prose-green mt-4 max-w-none text-black">
            <ReactMarkdown remarkPlugins={[gfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
              {current.answer}
            </ReactMarkdown>
          </div>

          <div className="mt-5 border-t border-[#F3F4F6] pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#059669]">Supporting sources</h3>
            {current.sources.length === 0 ? (
              <p className="mt-2 text-sm text-[#6B7280]">No approved document excerpts were used.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-[#374944]">
                {current.sources.map((s, i) => (
                  <li key={`${s.filename}-${i}`}>
                    {s.filename}
                    {typeof s.score === "number" ? ` · relevance ${s.score.toFixed(2)}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 text-xs text-[#6B7280]">
            This response is labeled <strong>draft</strong> automatically. It will never be marked approved by the
            assistant.
          </p>
        </article>
      )}
    </div>
  );
}
