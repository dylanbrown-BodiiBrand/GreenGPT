// src/app/api/index-now/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { makeLogger, errorResponse } from "@/utils/debug";
import { parsePDFviaLlama, parseDOCX, parseXLSX } from "@/utils/parse";
import { chunkMarkdown } from "@/utils/chunk";
import { embedBatch } from "@/utils/embeddings";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  // Server-only: needs storage access and chunk writes; use service role.
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// RAG budgets for indexing
const HARD_MAX_CHARS_PER_CHUNK = 1800; // ~450 tokens per chunk after parse
const INSERT_BATCH = 200;

export async function POST(req: NextRequest) {
  const { rid, dlog } = makeLogger("index-now");

  try {
    // ---- parse body
    const raw = await req.text();
    dlog("request", "raw body", raw);
    let payload: any;
    try {
      payload = JSON.parse(raw || "{}");
    } catch (e: any) {
      return errorResponse(400, rid, "parse.body", "BAD_JSON", e?.message || "invalid JSON");
    }
    const { documentId } = payload;
    if (!documentId) {
      return errorResponse(400, rid, "validate", "MISSING_DOCUMENT_ID", "documentId required");
    }

    // ---- load document row
    dlog("db.fetch", "Fetching document", { documentId });
    const { data: doc, error: selErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (selErr || !doc) {
      return errorResponse(404, rid, "db.fetch", "DOC_NOT_FOUND", selErr?.message || "not found");
    }
    if (!doc.object_key) {
      return errorResponse(400, rid, "validate", "MISSING_OBJECT_KEY", "document missing object_key; re-register");
    }

    // ---- set status: parsing
    dlog("status", "Set parsing");
    await supabase.from("documents").update({ status: "parsing" }).eq("id", doc.id);

    // ---- fetch file from storage
    dlog("storage.download", "Downloading from Storage", { object_key: doc.object_key });
    const { data: blob, error: dlErr } = await supabase.storage
      .from("rag-source")
      .download(doc.object_key);
    if (dlErr) return errorResponse(502, rid, "storage.download", "DOWNLOAD_FAILED", dlErr.message);

    const bytes = Buffer.from(await blob.arrayBuffer());
    dlog("storage.size", "Downloaded bytes", { size: bytes.length });
    if (!bytes.length) return errorResponse(502, rid, "storage.download", "EMPTY_BYTES", "Downloaded empty file");

    // ---- parse based on type
    const ext = (doc.file_type || "").toLowerCase();
    let units: string[] = [];
    dlog("parse.start", "Choosing parser", { ext });

    if (ext === "pdf") {
      // use bytes → LlamaParse flow
      units = await parsePDFviaLlama(bytes, doc.filename || "document.pdf", dlog);
    } else if (ext === "docx") {
      // mammoth needs a URL (use a signed URL)
      const { data: signed, error: signErr } = await supabase
        .storage
        .from("rag-source")
        .createSignedUrl(doc.object_key, 180);
      if (signErr || !signed?.signedUrl) {
        return errorResponse(502, rid, "sign.docx", "SIGNED_URL_FAILED", signErr?.message || "no signed URL");
      }
      units = await parseDOCX(signed.signedUrl, dlog);
    } else if (ext === "xlsx" || ext === "csv") {
      const { data: signed, error: signErr } = await supabase
        .storage
        .from("rag-source")
        .createSignedUrl(doc.object_key, 180);
      if (signErr || !signed?.signedUrl) {
        return errorResponse(502, rid, "sign.xlsx", "SIGNED_URL_FAILED", signErr?.message || "no signed URL");
      }
      units = await parseXLSX(signed.signedUrl, dlog);
    } else if (ext === "ppt" || ext === "pptx") {
      // current path doesn’t support PPT parsing — recommend exporting to PDF before upload
      return errorResponse(400, rid, "parse", "UNSUPPORTED_PPT", "Upload slides as PDF for now");
    } else {
      return errorResponse(400, rid, "parse", "UNSUPPORTED_TYPE", `Unsupported type: ${ext}`);
    }

    dlog("parse.done", "Units produced", { count: units.length });
    if (!units.length) return errorResponse(422, rid, "parse.done", "NO_UNITS", "Parser returned no text");

    // ---- chunk (and hard-crop oversized chunks)
    const chunksRaw = units.flatMap((u) => chunkMarkdown(u, 900, 80));
    const chunks = chunksRaw.map((c, i) => {
      if (c.length <= HARD_MAX_CHARS_PER_CHUNK) return c;
      dlog("chunk.trim", "oversized chunk trimmed", { idx: i, chars: c.length });
      return c.slice(0, HARD_MAX_CHARS_PER_CHUNK) + " …[trimmed]";
    });
    dlog("chunk.stats", "prepared", {
      units: units.length,
      totalChunks: chunks.length,
      maxChunkChars: Math.max(0, ...chunks.map((c) => c.length)),
      avgChunkChars:
        chunks.length ? Math.round(chunks.reduce((a, b) => a + b.length, 0) / chunks.length) : 0,
    });

    if (!chunks.length) {
      return errorResponse(422, rid, "chunk", "NO_CHUNKS", "No chunks generated from parsed text");
    }

    // ---- embed (token-safe & batched)
    const vectors = await embedBatch(chunks, (stage, msg, extra) => dlog(stage, msg, extra));
    if (vectors.length !== chunks.length) {
      return errorResponse(500, rid, "embed", "EMBED_COUNT_MISMATCH", `vectors=${vectors.length} chunks=${chunks.length}`);
    }

    // ---- clear previous chunks for this document
    dlog("chunks.clear", "Deleting old chunks");
    const { error: delErr } = await supabase.from("chunks").delete().eq("document_id", doc.id);
    if (delErr) return errorResponse(500, rid, "chunks.clear", "DELETE_FAILED", delErr.message);

    // ---- insert new chunks in batches (embedding as pgvector literal string)
    dlog("chunks.insert", "Inserting new chunks", { total: chunks.length, batch: INSERT_BATCH });
    for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
      const slice = chunks.slice(i, i + INSERT_BATCH);
      const rows = slice.map((content, j) => {
        const emb = vectors[i + j] as number[];
        return {
          document_id: doc.id,
          content,
          page_or_sheet: null as any,    // fill if you track pages/sheets
          section_path: null as any,     // fill if you track section headers
          token_count: Math.ceil(content.length / 4),
          embedding: `[${emb.join(",")}]`, // <-- pgvector literal
        };
      });

      const { error: insErr } = await supabase.from("chunks").insert(rows as any);
      if (insErr) return errorResponse(500, rid, "chunks.insert", "INSERT_FAILED", insErr.message);
    }

    // ---- mark ready
    dlog("status", "Set ready");
    await supabase
      .from("documents")
      .update({ status: "ready", last_indexed_at: new Date().toISOString() })
      .eq("id", doc.id);

    // ---- done
    dlog("done", "Index complete", { chunks: chunks.length });
    return new NextResponse(
      JSON.stringify({ ok: true, rid, chunks: chunks.length }, null, 2),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return errorResponse(500, rid, "unhandled", "UNCAUGHT", e?.message || String(e));
  }
}
