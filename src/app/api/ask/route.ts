// src/app/api/ask/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { embedBatch } from "@/utils/embeddings";
import { makeLogger, errorResponse } from "@/utils/debug";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Config
const RAG_BUCKET = process.env.SUPABASE_RAG_BUCKET || "rag-source";
const SIGNED_URL_TTL = Number(process.env.RAG_SIGNED_URL_TTL_SECS || 600);

// Budgets
const MAX_MATCHES = Number(process.env.RAG_MAX_MATCHES || 6);
const MAX_CHARS_PER_CHUNK = Number(process.env.RAG_MAX_CHARS_PER_CHUNK || 1800);
const MAX_CONTEXT_TOKENS = Number(process.env.RAG_MAX_CONTEXT_TOKENS || 4500);

// General intent retrieval width
const GENERAL_INTENT_K = Number(process.env.RAG_GENERAL_K || 10);

// Friendly-CTA config
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "Dylan.Brown@BodiiBrand.com";
const CAL_URL =
  process.env.CAL_URL || "https://cal.com/the-green-executive-briefing";

function isGeneralIntent(q: string): boolean {
  const s = (q || "").toLowerCase();
  if (/\b(tell me about (you|your( self)?|this|the (tool|service|product)))\b/.test(s)) return true;
  if (/\b(who (are|r) (you|the author|the team)|what (do|does) (you|this) do)\b/.test(s)) return true;
  if (/\b(your (background|experience|credentials|expertise|bio|story))\b/.test(s)) return true;
  if (/\b(general(ized)?|high[- ]level|overview|best practices|where do i start|how to get started)\b/.test(s)) return true;
  if (/\b(advice|guidance|framework|roadmap|strategy|playbook)\b/.test(s) && s.length < 140) return true;
  if (s.trim().length <= 24 && /\b(help|advice|guidance|tips)\b/.test(s)) return true;
  return false;
}

const approxTokens = (s: string) => Math.ceil(s.length / 4);

function buildFriendlyFallback(question: string) {
  return [
    `I couldn’t find a definitive answer to “${question}” in our internal docs yet, but here’s how we typically help:`,
    "",
    "• Quick take: share your goal, scope, timeline, and any data you already track (spend, emissions boundaries, frameworks in scope like GHG Protocol/ISO/ESG).",
    "• Next steps we’d propose: (1) clarify your objectives and reporting boundary, (2) map available data sources, (3) pick the right methodology, (4) outline a phased plan with quick wins.",
    `• If you’d like a precise recommendation, reply with a bit more context—or email us at ${SUPPORT_EMAIL} or book a quick call: ${CAL_URL}.`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const { rid, dlog } = makeLogger("ask");

  try {
    // 1) request
    const raw = await req.text();
    dlog("request.body", "raw", raw);
    let payload: any;
    try {
      payload = JSON.parse(raw || "{}");
    } catch (e: any) {
      return errorResponse(400, rid, "parse.body", "BAD_JSON", e?.message || "Invalid JSON");
    }

    const question = payload?.question?.toString?.();
    if (!question) return errorResponse(400, rid, "validate", "MISSING_QUESTION", "No question");
    dlog("question", "received", { question });

    // 2) intent + embed
    const generalIntent = isGeneralIntent(question);
    dlog("intent", "generalIntent", { generalIntent });

    const queryForEmbedding = generalIntent
      ? `${question} — overview • summary • profile • experience • services • case studies • methodology • credentials`
      : question;

    dlog("embed.start", "creating embedding");
    const [qvec] = await embedBatch([queryForEmbedding]);
    dlog("embed.done", "embedding size", { dims: qvec.length });

    // 3) retrieve
    const requestedK = Number.isFinite(payload?.k) ? Math.min(Number(payload.k), MAX_MATCHES) : MAX_MATCHES;
    const k = generalIntent ? Math.max(requestedK, Math.min(GENERAL_INTENT_K, 20)) : requestedK;

    dlog("retrieve.rpc", "match_chunks", { k, generalIntent });
    const { data: hits, error } = await supabase.rpc("match_chunks", {
      query_embedding: qvec,
      match_count: k,
    });
    if (error) {
      dlog("retrieve.error", "match_chunks failed", { error: error.message });
      return errorResponse(500, rid, "retrieve", "VECTOR_RPC_FAILED", error.message);
    }
    dlog("retrieve.done", "hits", { hitCount: (hits || []).length });

    // 3b) hydrate docs
    const ids = Array.from(new Set((hits || []).map((h: any) => h.document_id)));
    let docMeta = new Map<string, { filename: string; object_key: string }>();
    if (ids.length) {
      const { data: docs, error: docErr } = await supabase
        .from("documents")
        .select("id, filename, object_key")
        .in("id", ids);
      if (!docErr && docs) {
        docMeta = new Map(docs.map((d: any) => [d.id, { filename: d.filename, object_key: d.object_key }]));
      }
    }

    (hits || []).forEach((h: any, i: number) => {
      const meta = docMeta.get(h.document_id);
      dlog("retrieve.hit", `#${i + 1}`, {
        score: h.score,
        document_id: h.document_id,
        filename: meta?.filename,
        preview: (h.content || "").slice(0, 160).replace(/\s+/g, " ") + "…",
      });
    });

    // 4) context assembly
    let usedTokens = 0;
    let truncatedCount = 0;
    const selected: any[] = [];

    for (const [i, h] of (hits || []).entries()) {
      if (!h?.content) continue;

      let content = String(h.content);
      if (content.length > MAX_CHARS_PER_CHUNK) {
        content = content.slice(0, MAX_CHARS_PER_CHUNK) + " …[truncated]";
        truncatedCount++;
      }

      const block = `[#${i + 1}] (${h.page_or_sheet ?? "n/a"}) ${h.section_path ?? ""}\n${content}`;
      const blockTokens = approxTokens(block);
      if (usedTokens + blockTokens > MAX_CONTEXT_TOKENS) {
        dlog("context.skip", "would exceed budget", {
          atHit: i + 1,
          wouldUse: usedTokens + blockTokens,
          budget: MAX_CONTEXT_TOKENS,
        });
        break;
      }
      selected.push({ idx: i, h, block, blockTokens });
      usedTokens += blockTokens;
    }

    const context = selected.map((s) => s.block).join("\n\n---\n\n");
    dlog("context", "assembled", {
      chunksSelected: selected.length,
      truncatedChunks: truncatedCount,
      approxContextTokens: usedTokens,
    });

    // If we have zero usable context, return a friendly fallback immediately.
    if (!selected.length) {
      const answer = buildFriendlyFallback(question);
      dlog("response", "friendly-fallback-empty-context");
      return NextResponse.json({ answer, citations: [], generalIntent });
    }

    // 5) LLM
    const baseSystem = (() => {
      // Make the assistant helpful even when context is thin.
      return [
        `You are precise and grounded. Use ONLY the provided context for factual claims and cite as [#index].`,
        `If the context isn’t sufficient to answer confidently, do NOT say "I don't know".`,
        `Instead: (1) briefly acknowledge the gap, (2) list a few concrete next steps or clarifying questions,`,
        `(3) optionally share a short, high-level best-practice outline that is safe and non-specific,`,
        `(4) end with this call to action: "If you'd like, email ${SUPPORT_EMAIL} or book a quick call: ${CAL_URL}."`,
        `Never invent credentials or facts not in context.`,
      ].join(" ");
    })();

    const personaAddOn = generalIntent
      ? " When asked for generalized advice or about us, summarize capabilities strictly from the context. If first-person details are present, you may use them; otherwise use 'we'/'this practice'."
      : "";

    const system = baseSystem + personaAddOn;
    const user = `Question: ${question}\n\nContext:\n${context}`;

    dlog("llm.call", "openai.chat.completions.create", { model: "gpt-4o-mini", temperature: 0.2, generalIntent });
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    });
    dlog("llm.done", "received");
    let answer = resp.choices?.[0]?.message?.content ?? "";

    // 6) citations with filenames
    const citationsRaw = selected.map(({ idx, h }) => {
      const meta = docMeta.get(h.document_id) || ({ filename: null, object_key: null } as any);
      return {
        ref: `#${idx + 1}`,
        document_id: h.document_id as string,
        filename: meta?.filename ?? null,
        object_key: meta?.object_key ?? null,
        page_or_sheet: h.page_or_sheet as string | null,
        section_path: h.section_path as string | null,
      };
    });

    // 6a) Dedupe by document_id
    const seen = new Set<string>();
    const deduped = citationsRaw.filter((c) => {
      if (!c.document_id) return false;
      if (seen.has(c.document_id)) return false;
      seen.add(c.document_id);
      return true;
    });

    // 6b) Sign URLs
    const withUrls = await Promise.all(
      deduped.map(async (c) => {
        if (!c.object_key) return { ...c, url: null as string | null };
        const { data: signed, error: signErr } = await supabase.storage
          .from(RAG_BUCKET)
          .createSignedUrl(c.object_key, SIGNED_URL_TTL);
        if (signErr || !signed?.signedUrl) {
          dlog("sign.error", "failed to sign", { object_key: c.object_key, error: signErr?.message });
          return { ...c, url: null as string | null };
        }
        return { ...c, url: signed.signedUrl as string };
      })
    );

    const citations = withUrls.map(({ object_key, ...rest }) => rest);

    // 7) Post-process: if the model still hedged, replace with friendly fallback
    const hedging =
      !answer ||
      /\b(i (do not|don't|cannot|can't) (know|tell)|not sure|insufficient|no (context|information))\b/i.test(answer);

    if (hedging) {
      dlog("response.postprocess", "hedge-detected -> friendly-fallback");
      answer = buildFriendlyFallback(question);
    }

    dlog("response", "success", {
      answerLen: answer.length,
      citations: citations.length,
      files: citations.map((c) => c.filename).filter(Boolean),
      generalIntent,
    });

    return NextResponse.json({ answer, citations, generalIntent });
  } catch (e: any) {
    return errorResponse(500, rid, "unhandled", "UNCAUGHT", e?.message || String(e));
  }
}
