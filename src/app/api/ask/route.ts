export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { assertFacilityAccess, listMembershipsForUser } from "@/lib/workspace/membership";
import { logAskRetrieval } from "@/lib/workspace/agent/askLog";
import { filterChunksForTenant } from "@/lib/workspace/agent/retrieval";
import {
  formatAskContext,
  loadAskContext,
  previewAskContext,
  type AskFacilityContext,
} from "@/lib/workspace/askContext";
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
const MIN_SOURCE_SCORE = Number(process.env.RAG_MIN_SOURCE_SCORE || 0.3);
const MAX_PER_LIBRARY = 3;
const ASK_MODEL = process.env.ASK_MODEL || "gpt-4o";

const approxTokens = (s: string) => Math.ceil(s.length / 4);

type SourceLibrary = "regulation" | "ehs_library" | "client_document" | "workspace";
type AskSource = { documentId?: string; filename: string; score?: number; library: SourceLibrary };

const SYSTEM_PROMPT = [
  "You are GreenGPT, an industrial EHS compliance assistant for manufacturing and industrial facilities",
  "(OSHA, EPA air/water/waste, SPCC, EPCRA, DOT hazmat), supporting a qualified EHS professional.",
  "Ground every statement in the provided FACILITY CONTEXT (profile, intake site details, obligation register,",
  "open corrective actions, missing evidence) and SOURCE EXCERPTS (regulations, GreenGPT Advisory EHS library,",
  "the client's approved documents).",
  "Use facility context for status, deadline, and site-specific questions. Use regulation excerpts for regulatory",
  "requirements and cite them by citation (e.g. 40 CFR 112.7). Say which source each point comes from.",
  "Do not invent citations, deadlines, thresholds, or applicability; if an answer depends on facts not in the",
  "context, name the facts the EHS professional must confirm.",
  "Applicability statements are drafts for EHS review, not determinations. Not legal advice. Never say anything is approved.",
  "Structure the answer: direct answer; requirements with citations; this facility's status from the register when",
  "relevant; gaps needing EHS review; suggested next actions.",
  'Respond as JSON: {"supported": boolean, "answer": string (markdown)}.',
  "Set supported to false when the context cannot support a useful answer.",
].join(" ");

function libraryOf(h: { organization_id: string | null; library: string | null }): SourceLibrary {
  if (h.organization_id) return "client_document";
  return h.library === "regulation" ? "regulation" : "ehs_library";
}

function draftEnvelope(payload: {
  answer: string;
  insufficientSources: boolean;
  sources: AskSource[];
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

    let organizationId: string | null = null;
    let facilityContext: AskFacilityContext | null = null;
    const memberships = await listMembershipsForUser(user);
    if (facilityId) {
      const access = await assertFacilityAccess(user, facilityId);
      facilityLabel = access.facilityName;
      organizationId = access.organizationId;
      const orgName = memberships.find((m) => m.organizationId === organizationId)?.organizationName ?? "";
      facilityContext = await loadAskContext(supabase, organizationId, orgName, facilityId);
    } else {
      organizationId = memberships[0]?.organizationId ?? null;
      if (payload.preview === true && !organizationId) facilityContext = previewAskContext();
    }
    const facilityState = facilityContext?.facility.state ?? null;

    dlog("question", "received", { question, facilityId, facilityLabel, facilityState });

    const [qvec] = await embedBatch([question]);
    const requestedK = Number.isFinite(payload?.k)
      ? Math.min(Number(payload.k), MAX_MATCHES)
      : MAX_MATCHES;

    const { data: hits, error } = await supabase.rpc("match_chunks_scoped", {
      query_embedding: qvec,
      match_count: Math.min(20, requestedK * 2),
      filter_org: organizationId,
      filter_facility: facilityId,
      filter_state: facilityState,
    });
    if (error) {
      return errorResponse(500, rid, "retrieve", "VECTOR_RPC_FAILED", error.message);
    }

    type Hit = {
      document_id: string;
      filename: string | null;
      organization_id: string | null;
      facility_id: string | null;
      approved: boolean | null;
      library: string | null;
      jurisdiction: string | null;
      content: string;
      score?: number;
      page_or_sheet?: string;
      section_path?: string;
    };
    const candidates: Hit[] = ((hits ?? []) as Hit[]).filter(
      (h) =>
        Boolean(h?.document_id && h?.content) &&
        (typeof h.score !== "number" || h.score >= MIN_SOURCE_SCORE)
    );
    const scored = filterChunksForTenant(
      candidates,
      candidates.map((h) => ({
        id: h.document_id,
        organization_id: h.organization_id,
        facility_id: h.facility_id,
        approved: h.approved,
        library: h.library,
        jurisdiction: h.jurisdiction,
      })),
      { organizationId, facilityId, state: facilityState }
    );

    let usedTokens = 0;
    const selected: { h: Hit; block: string }[] = [];
    const perLibrary = new Map<SourceLibrary, number>();

    for (const h of scored) {
      const lib = libraryOf(h);
      if ((perLibrary.get(lib) ?? 0) >= MAX_PER_LIBRARY) continue;
      let content = String(h.content);
      if (content.length > MAX_CHARS_PER_CHUNK) {
        content = content.slice(0, MAX_CHARS_PER_CHUNK) + " …[truncated]";
      }
      const label =
        lib === "regulation"
          ? `Regulation (${h.jurisdiction ?? "federal"})`
          : lib === "client_document"
            ? "Client approved document"
            : "GreenGPT Advisory EHS library";
      const block = `[#${selected.length + 1}] ${label} — ${h.filename ?? "document"}\n${content}`;
      const blockTokens = approxTokens(block);
      if (usedTokens + blockTokens > MAX_CONTEXT_TOKENS) break;
      selected.push({ h, block });
      perLibrary.set(lib, (perLibrary.get(lib) ?? 0) + 1);
      usedTokens += blockTokens;
    }

    const sources: AskSource[] = selected.map(({ h }) => ({
      documentId: h.document_id,
      filename: h.filename || "Approved document",
      score: typeof h.score === "number" ? h.score : undefined,
      library: libraryOf(h),
    }));
    if (facilityContext) sources.unshift({ filename: facilityContext.label, library: "workspace" });

    if (!selected.length && !facilityContext) {
      if (organizationId) {
        await logAskRetrieval({
          supabase,
          organizationId,
          facilityId,
          question,
          answer: INSUFFICIENT_SOURCES_MESSAGE,
          sources: [],
        });
      }
      return NextResponse.json(
        draftEnvelope({
          answer: INSUFFICIENT_SOURCES_MESSAGE,
          insufficientSources: true,
          sources: [],
          facilityLabel,
        })
      );
    }

    const excerpts = selected.map((s) => s.block).join("\n\n---\n\n") || "(no matching excerpts)";
    const facilityBlock = facilityContext
      ? formatAskContext(facilityContext, new Date().toISOString().slice(0, 10))
      : facilityLabel
        ? `Facility: ${facilityLabel} (no workspace records available).`
        : "(no facility selected)";

    const resp = await openai.chat.completions.create({
      model: ASK_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Question: ${question}\n\nFACILITY CONTEXT:\n${facilityBlock}\n\nSOURCE EXCERPTS:\n${excerpts}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    let answer = "";
    let supported = false;
    try {
      const parsed = JSON.parse(resp.choices?.[0]?.message?.content ?? "{}");
      answer = typeof parsed.answer === "string" ? parsed.answer.replace(/\s*\[#\d+\]/g, "").trim() : "";
      supported = parsed.supported === true && Boolean(answer);
    } catch {
      supported = false;
    }

    if (!supported) {
      if (organizationId) {
        await logAskRetrieval({
          supabase,
          organizationId,
          facilityId,
          question,
          answer: INSUFFICIENT_SOURCES_MESSAGE,
          sources: sources.map((s) => ({
            documentId: s.documentId,
            filename: s.filename,
            score: s.score,
          })),
        });
      }
      return NextResponse.json(
        draftEnvelope({
          answer: INSUFFICIENT_SOURCES_MESSAGE,
          insufficientSources: true,
          sources,
          facilityLabel,
        })
      );
    }

    if (organizationId) {
      await logAskRetrieval({
        supabase,
        organizationId,
        facilityId,
        question,
        answer,
        sources: sources.map((s) => ({
          documentId: s.documentId,
          filename: s.filename,
          score: s.score,
        })),
      });
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
