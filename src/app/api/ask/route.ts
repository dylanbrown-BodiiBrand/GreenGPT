export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { assertFacilityAccess } from "@/lib/workspace/membership";
import { INSUFFICIENT_SOURCES_MESSAGE } from "@/lib/workspace/types";
import { embedBatch } from "@/utils/embeddings";
import { makeLogger, errorResponse } from "@/utils/debug";
import { httpStatusFromError } from "@/lib/auth/httpError";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MAX_MATCHES = Number(process.env.RAG_MAX_MATCHES || 6);
const MAX_CHARS_PER_CHUNK = Number(process.env.RAG_MAX_CHARS_PER_CHUNK || 1800);
const MAX_CONTEXT_TOKENS = Number(process.env.RAG_MAX_CONTEXT_TOKENS || 4500);
const MIN_SOURCE_SCORE = Number(process.env.RAG_MIN_SOURCE_SCORE || 0.15);

const approxTokens = (s: string) => Math.ceil(s.length / 4);

function draftEnvelope(payload: {
  answer: string;
  insufficientSources: boolean;
  sources: { documentId?: string; filename: string; score?: number }[];
  facilityLabel: string | null;
  generalIntent?: boolean;
}) {
  return {
    ...payload,
    reviewStatus: "draft" as const,
    generalIntent: !!payload.generalIntent,
  };
}

export async function POST(req: NextRequest) {
  const { rid, dlog } = makeLogger("ask");

  try {
    const user = await requireSessionUser();

    const raw = await req.text();
    dlog("request.body", "raw", raw);
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw || "{}");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      return errorResponse(400, rid, "parse.body", "BAD_JSON", msg);
    }

    const question = payload?.question?.toString?.();
    if (!question) return errorResponse(400, rid, "validate", "MISSING_QUESTION", "No question");

    let facilityLabel =
      typeof payload.facilityLabel === "string" ? payload.facilityLabel.trim().slice(0, 200) : null;
    const facilityId =
      typeof payload.facilityId === "string" && payload.facilityId.trim()
        ? payload.facilityId.trim()
        : null;

    if (facilityId) {
      const access = await assertFacilityAccess(user, facilityId);
      facilityLabel = access.facilityName;
    }

    dlog("question", "received", { question, facilityId, facilityLabel });

    const [qvec] = await embedBatch([question]);
    const requestedK = Number.isFinite(payload?.k)
      ? Math.min(Number(payload.k), MAX_MATCHES)
      : MAX_MATCHES;

    const { data: hits, error } = await supabase.rpc("match_chunks", {
      query_embedding: qvec,
      match_count: requestedK,
    });
    if (error) {
      return errorResponse(500, rid, "retrieve", "VECTOR_RPC_FAILED", error.message);
    }

    const scored = (hits || []).filter(
      (h: { score?: number; content?: string }) =>
        h?.content && (typeof h.score !== "number" || h.score >= MIN_SOURCE_SCORE)
    );

    const ids = Array.from(new Set(scored.map((h: { document_id: string }) => h.document_id)));
    const docMeta = new Map<string, { filename: string }>();
    if (ids.length) {
      const { data: docs } = await supabase.from("documents").select("id, filename").in("id", ids);
      for (const d of docs ?? []) {
        docMeta.set(d.id, { filename: d.filename });
      }
    }

    let usedTokens = 0;
    const selected: { h: { document_id: string; score?: number; content: string; page_or_sheet?: string; section_path?: string }; block: string }[] = [];

    for (const [i, h] of scored.entries()) {
      let content = String(h.content);
      if (content.length > MAX_CHARS_PER_CHUNK) {
        content = content.slice(0, MAX_CHARS_PER_CHUNK) + " …[truncated]";
      }
      const block = `[#${i + 1}] (${h.page_or_sheet ?? "n/a"}) ${h.section_path ?? ""}\n${content}`;
      const blockTokens = approxTokens(block);
      if (usedTokens + blockTokens > MAX_CONTEXT_TOKENS) break;
      selected.push({ h, block });
      usedTokens += blockTokens;
    }

    const sources = selected.map(({ h }) => ({
      documentId: h.document_id,
      filename: docMeta.get(h.document_id)?.filename || "Approved document",
      score: typeof h.score === "number" ? h.score : undefined,
    }));

    if (!selected.length) {
      return NextResponse.json(
        draftEnvelope({
          answer: INSUFFICIENT_SOURCES_MESSAGE,
          insufficientSources: true,
          sources: [],
          facilityLabel,
        })
      );
    }

    const context = selected.map((s) => s.block).join("\n\n---\n\n");
    const system = [
      "You are GreenGPT, a source-grounded EHS compliance assistant for industrial facilities.",
      "Use ONLY the provided approved-document context for factual and regulatory claims.",
      "If the context is insufficient, say so clearly and do not invent CFR citations, deadlines, or applicability.",
      "Do not provide legal advice. Frame outputs as drafts for EHS professional review.",
      facilityLabel ? `Facility context label: ${facilityLabel}.` : "",
      "Do not mark anything as approved. Do not claim final compliance determinations.",
    ]
      .filter(Boolean)
      .join(" ");

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Question: ${question}\n\nApproved source context:\n${context}` },
      ],
      temperature: 0.1,
    });

    let answer = resp.choices?.[0]?.message?.content ?? "";
    answer = answer.replace(/\s*\[#\d+\]/g, "");

    const hedging =
      !answer ||
      /\b(i (do not|don't|cannot|can't) (know|tell)|not sure|insufficient|no (context|information)|cannot support)\b/i.test(
        answer
      );

    if (hedging) {
      return NextResponse.json(
        draftEnvelope({
          answer: INSUFFICIENT_SOURCES_MESSAGE,
          insufficientSources: true,
          sources,
          facilityLabel,
        })
      );
    }

    return NextResponse.json(
      draftEnvelope({
        answer,
        insufficientSources: false,
        sources,
        facilityLabel,
      })
    );
  } catch (e: unknown) {
    const status = httpStatusFromError(e, 500);
    const message = e instanceof Error ? e.message : String(e);
    return errorResponse(status, rid, "unhandled", status === 401 ? "UNAUTHORIZED" : "UNCAUGHT", message);
  }
}
