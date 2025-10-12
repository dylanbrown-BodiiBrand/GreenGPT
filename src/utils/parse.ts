// src/utils/parse.ts
// Runtime: Node (Next.js API routes with `export const runtime = "nodejs"`)
// Env required: LLAMA_CLOUD_API_KEY
//
// Includes:
// - parsePDFviaLlama(bytes, filename, dlog): bytes → LlamaParse → Markdown units[]
// - parseDOCX(url, dlog): DOCX URL → Markdown[]
// - parseXLSX(url, dlog): XLSX/CSV URL → Markdown tables[]

import mammoth from "mammoth";
import ExcelJS from "exceljs";
import type { DLog } from "./debug";

/**
 * Uploads PDF bytes to LlamaParse, polls until SUCCESS, then fetches Markdown.
 * Uses Web FormData/Blob (do NOT use npm 'form-data').
 * Result payloads can be raw markdown or JSON-enveloped; we unwrap safely.
 */
export async function parsePDFviaLlama(
  bytes: Buffer,
  filename: string,
  dlog: DLog
): Promise<string[]> {
  const apiKey = process.env.LLAMA_CLOUD_API_KEY;
  if (!apiKey) throw new Error("LLAMA_CLOUD_API_KEY missing");

  const apiBase = "https://api.cloud.llamaindex.ai/api/v1";

  dlog("pdf.upload.start", "Uploading PDF to LlamaParse", { filename, size: bytes.length });

  // Web Blob/FormData with native fetch
  const blob = new Blob([bytes], { type: "application/pdf" });
  const form = new FormData();
  form.append("file", blob, filename);
  // Optional tuning:
  // form.append("config.preset", "cost_effective");
  // form.append("output_format", "markdown");

  const uploadRes = await fetch(`${apiBase}/parsing/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const uploadText = await uploadRes.text();
  if (!uploadRes.ok) {
    dlog("pdf.upload.error", "Upload failed", { status: uploadRes.status, body: uploadText.slice(0, 800) });
    throw new Error(`LlamaParse upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  let jobId: string | undefined;
  try {
    const data = JSON.parse(uploadText);
    jobId = data.job_id || data.id;
  } catch (e: any) {
    dlog("pdf.upload.parse_error", "Upload JSON parse error", { uploadText: uploadText.slice(0, 800) });
    throw new Error(`LlamaParse upload JSON parse error: ${e?.message}`);
  }
  if (!jobId) {
    dlog("pdf.upload.no_job", "Upload response missing job_id", { uploadText: uploadText.slice(0, 800) });
    throw new Error("LlamaParse: job_id missing from upload response");
  }

  // Poll for completion
  dlog("pdf.poll.start", "Polling job", { jobId });
  const start = Date.now();
  const timeoutMs = 120_000;
  const intervalMs = 1500;

  while (Date.now() - start < timeoutMs) {
    const jr = await fetch(`${apiBase}/parsing/job/${encodeURIComponent(jobId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const jtext = await jr.text();
    if (!jr.ok) {
      dlog("pdf.poll.error", "Get job failed", { status: jr.status, body: jtext.slice(0, 800) });
      throw new Error(`LlamaParse get job failed: ${jr.status} ${jr.statusText}`);
    }
    let j: any;
    try {
      j = JSON.parse(jtext);
    } catch {
      dlog("pdf.poll.json_error", "Get job JSON parse error", { jtext: jtext.slice(0, 800) });
      throw new Error("LlamaParse get job JSON parse error");
    }

    const status = (j.status || "").toUpperCase();
    dlog("pdf.poll.tick", "Job status", { status });
    if (status === "SUCCESS") break;
    if (status === "FAILED") {
      dlog("pdf.poll.failed", "Job failed", j);
      throw new Error(`LlamaParse job failed: ${j.error || "unknown"}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  // Fetch Markdown result (correct endpoint; fallback to raw variant)
  dlog("pdf.result.start", "Fetching MD result", { jobId });

  let rr = await fetch(`${apiBase}/parsing/job/${encodeURIComponent(jobId)}/result/markdown`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  let mdText = await rr.text();

  if (rr.status === 404) {
    dlog("pdf.result.retry", "Primary 404, trying raw markdown");
    rr = await fetch(`${apiBase}/parsing/job/${encodeURIComponent(jobId)}/result/raw/markdown`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    mdText = await rr.text();
  }

  if (!rr.ok) {
    dlog("pdf.result.error", "Result fetch failed", { status: rr.status, body: mdText.slice(0, 800) });
    throw new Error(`LlamaParse result fetch failed: ${rr.status} ${rr.statusText}`);
  }

  // --- Unwrap: some orgs/accounts receive JSON, not raw MD
  function unwrapMarkdown(maybeJson: string): string[] {
    const t = (maybeJson || "").trim();

    // If it's not JSON-looking, it's raw Markdown
    if (!(t.startsWith("{") || t.startsWith("["))) return [t];

    try {
      const obj = JSON.parse(t);

      // Shape 1: { markdown: "..." }
      if (typeof obj?.markdown === "string") return [obj.markdown];

      // Shape 2: { pages: [{ markdown: "..." }, ...] }
      if (Array.isArray(obj?.pages)) {
        const pages = obj.pages
          .filter((p: any) => typeof p?.markdown === "string")
          .map((p: any) => p.markdown);
        if (pages.length) return pages;
      }

      // Shape 3: [ { markdown: "..." }, { pages: [...] }, ...]
      if (Array.isArray(obj)) {
        const items = obj.flatMap((it: any) => {
          if (typeof it?.markdown === "string") return [it.markdown];
          if (Array.isArray(it?.pages)) {
            return it.pages
              .filter((p: any) => typeof p?.markdown === "string")
              .map((p: any) => p.markdown);
          }
          return [];
        });
        if (items.length) return items;
      }

      // Fallback: treat as raw text if no markdown fields found
      return [t];
    } catch {
      // Not parseable as JSON—assume raw markdown
      return [t];
    }
  }

  const unitsRaw = unwrapMarkdown(mdText);
  const units = unitsRaw.map((m: string, i: number) =>
    m.startsWith("# ") ? m : `# Page ${i + 1}\n\n${m}`
  );

  if (!units.length || !units.some((u) => u.trim().length > 0)) {
    dlog("pdf.result.empty", "Empty markdown result after unwrap");
    throw new Error("LlamaParse returned empty markdown");
  }

  dlog("pdf.result.done", "Parsed markdown units", { count: units.length });
  return units;
}

/**
 * DOCX → Markdown (keeps HTML inside MD for fidelity). Expects a (signed) URL.
 */
export async function parseDOCX(url: string, dlog: DLog): Promise<string[]> {
  dlog("docx.fetch", "Fetching DOCX", { url });
  const resp = await fetch(url);
  const arr = await resp.arrayBuffer();
  const buf = Buffer.from(arr);
  dlog("docx.size", "Bytes fetched", { size: buf.length });

  const { value: html } = await mammoth.convertToHtml({ buffer: buf });
  dlog("docx.done", "Converted to HTML length", { len: html.length });

  return [`# Document\n${html}`];
}

/**
 * XLSX/CSV → Markdown tables per sheet. Expects a (signed) URL.
 */
export async function parseXLSX(url: string, dlog: DLog): Promise<string[]> {
  dlog("xlsx.fetch", "Fetching XLSX/CSV", { url });
  const resp = await fetch(url);
  const arr = await resp.arrayBuffer();
  const buf = Buffer.from(arr);
  dlog("xlsx.size", "Bytes fetched", { size: buf.length });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as any);

  const out: string[] = [];
  wb.worksheets.forEach((sheet) => {
    let md = `# Sheet: ${sheet.name}\n\n`;
    const rows: string[][] = [];
    sheet.eachRow((row) => rows.push(row.values as any as string[]));
    dlog("xlsx.sheet", "Rows", { sheet: sheet.name, rows: rows.length });

    if (rows.length) {
      const width = Math.max(...rows.map((r) => r?.length || 0));
      const norm = rows.map((r) =>
        Array.from({ length: width }, (_, i) => (r?.[i + 1] ?? "").toString())
      );
      md += `| ${norm[0].join(" | ")} |\n| ${norm[0].map(() => "---").join(" | ")} |\n`;
      for (let i = 1; i < norm.length; i++) md += `| ${norm[i].join(" | ")} |\n`;
    }
    out.push(md);
  });

  dlog("xlsx.done", "Sheets parsed", { count: out.length });
  return out;
}
