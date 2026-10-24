/**
 * Bulk-upload local "ehs rag docs" files to Supabase rag-source and index them.
 *
 * The local folder is NOT watched automatically — this script is the bridge.
 *
 * Usage:
 *   node scripts/ingest-ehs-rag.mjs                  # dry-run (list files)
 *   node scripts/ingest-ehs-rag.mjs --index          # upload + index via production API
 *   node scripts/ingest-ehs-rag.mjs --index --local  # use http://localhost:3000 (dev server)
 *   node scripts/ingest-ehs-rag.mjs --index --limit 1
 *   node scripts/ingest-ehs-rag.mjs --index --filter "permit to work"
 *   node scripts/ingest-ehs-rag.mjs --index --skip-upload
 *
 * Client documents (never mix into the shared library):
 *   node scripts/ingest-ehs-rag.mjs --index --dir "client docs/acme" --org <org-uuid> [--facility <facility-uuid>] [--approved]
 *   --org      tags documents to one client organization (stored under orgs/<org>/ in rag-source)
 *   --facility limits them to one facility in that organization
 *   --approved marks them client-approved so they can ground answers; otherwise they stay draft
 *   Without --org, files go to the shared library (federal/state rules, EHS reference material).
 *
 * Shared library category (spec §3.6; uncategorized shared documents never ground answers):
 *   --library regulation|ehs_guidance|template   default: by folder (EHS Implementation Guideline → ehs_guidance,
 *                                                EHS Mandatory Forms / EHS Suggested Template → template)
 *   --jurisdiction "New Jersey"                  state rules; must match facilities.state (federal rules: scripts/sync-ecfr.mjs)
 *   node scripts/ingest-ehs-rag.mjs --index --dir "regulations/New Jersey" --library regulation --jurisdiction "New Jersey"
 *
 * Env (from .env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
 * Production indexing also needs LLAMA_CLOUD_API_KEY on Vercel (PDF parsing).
 * Optional: APP_URL or NEXT_PUBLIC_APP_URL (default https://greengptadvisory.com)
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname, relative, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const DEFAULT_RAG_DIR = resolve(root, "ehs rag docs");
const BUCKET = "rag-source";
const SUPPORTED = new Set(["pdf", "docx", "xlsx", "csv", "md", "txt"]);
const LIBRARIES = new Set(["regulation", "ehs_guidance", "template"]);

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    const hash = val.indexOf(" #");
    if (hash >= 0) val = val.slice(0, hash).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function walkFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function contentType(ext) {
  const map = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    md: "text/markdown",
    txt: "text/plain",
  };
  return map[ext] || "application/octet-stream";
}

function parseArgs(argv) {
  const args = {
    index: false,
    skipUpload: false,
    local: false,
    limit: Infinity,
    filter: null,
    dir: null,
    org: null,
    facility: null,
    approved: false,
    library: null,
    jurisdiction: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--index") args.index = true;
    else if (a === "--skip-upload") args.skipUpload = true;
    else if (a === "--local") args.local = true;
    else if (a === "--limit") args.limit = Number(argv[++i]) || 1;
    else if (a === "--filter") args.filter = (argv[++i] || "").toLowerCase();
    else if (a === "--dir") args.dir = argv[++i] || null;
    else if (a === "--org") args.org = argv[++i] || null;
    else if (a === "--facility") args.facility = argv[++i] || null;
    else if (a === "--approved") args.approved = true;
    else if (a === "--library") args.library = argv[++i] || null;
    else if (a === "--jurisdiction") args.jurisdiction = argv[++i] || null;
  }
  return args;
}

function sharedLibraryFor(rel) {
  if (args.library) return args.library;
  if (rel.startsWith("EHS Implementation Guideline/")) return "ehs_guidance";
  if (rel.startsWith("EHS Mandatory Forms/") || rel.startsWith("EHS Suggested Template/")) return "template";
  return "ehs_guidance";
}

async function tagClientDocument(supabase, { documentId, org, facility, approved, title, fileType, objectKey }) {
  if (facility) {
    const { data, error } = await supabase.from("facilities").select("organization_id").eq("id", facility).maybeSingle();
    if (error || !data) throw new Error("facility not found");
    if (data.organization_id !== org) throw new Error("facility does not belong to --org");
  }
  const { error: tagErr } = await supabase
    .from("documents")
    .update({ organization_id: org, facility_id: facility })
    .eq("id", documentId);
  if (tagErr) throw new Error(`tag document: ${tagErr.message}`);

  const { data: link, error: linkErr } = await supabase
    .from("workspace_documents")
    .select("id, approval_status")
    .eq("rag_document_id", documentId)
    .maybeSingle();
  if (linkErr) throw new Error(`read workspace document: ${linkErr.message}`);

  if (!link) {
    const { error } = await supabase.from("workspace_documents").insert({
      organization_id: org,
      facility_id: facility,
      title,
      doc_type: fileType || null,
      approval_status: approved ? "approved" : "draft",
      source_uri: objectKey,
      rag_document_id: documentId,
      notes: approved ? "Client-approved at ingestion." : "Indexed; must be approved before it can ground answers.",
    });
    if (error) throw new Error(`link workspace document: ${error.message}`);
    return;
  }
  const { error } = await supabase
    .from("workspace_documents")
    .update({
      organization_id: org,
      facility_id: facility,
      ...(approved && link.approval_status !== "approved" ? { approval_status: "approved" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id);
  if (error) throw new Error(`update workspace document: ${error.message}`);
}

async function registerDocument(supabase, objectKey, catalog = {}) {
  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectKey, 120);
  if (signErr || !signed?.signedUrl) throw new Error(`signed URL: ${signErr?.message || "missing"}`);

  const res = await fetch(signed.signedUrl);
  if (!res.ok) throw new Error(`fetch bytes: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("empty file in storage");

  const content_hash = createHash("sha256").update(buf).digest("hex");
  const filename = objectKey.split("/").pop() || objectKey;
  const file_type = (filename.split(".").pop() || "").toLowerCase();
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);

  const { data: existing, error: selErr } = await supabase
    .from("documents")
    .select("id, content_hash")
    .eq("filename", filename)
    .eq("object_key", objectKey)
    .maybeSingle();
  if (selErr) throw new Error(`db select: ${selErr.message}`);

  let documentId;
  if (!existing) {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        title: filename.replace(/\.[^.]+$/, ""),
        filename,
        file_type,
        source_url: pub.publicUrl,
        object_key: objectKey,
        content_hash,
        status: "pending",
        metadata: {},
        ...catalog,
      })
      .select("id")
      .single();
    if (error) throw new Error(`db insert: ${error.message}`);
    documentId = data.id;
  } else {
    documentId = existing.id;
    const changed = existing.content_hash !== content_hash;
    if (changed || Object.keys(catalog).length) {
      const { error } = await supabase
        .from("documents")
        .update({ ...catalog, ...(changed ? { content_hash, status: "pending" } : {}) })
        .eq("id", documentId);
      if (error) throw new Error(`db update: ${error.message}`);
    }
  }
  return documentId;
}

loadEnvLocal();

const args = parseArgs(process.argv);
const RAG_DIR = args.dir ? resolve(root, args.dir) : DEFAULT_RAG_DIR;
if (args.facility && !args.org) {
  console.error("--facility requires --org");
  process.exit(1);
}
if (args.org && RAG_DIR === DEFAULT_RAG_DIR) {
  console.error("Client documents need their own --dir; the default folder is the shared library.");
  process.exit(1);
}
if (args.org && (args.library || args.jurisdiction)) {
  console.error("--library and --jurisdiction apply to the shared library only, not --org client documents.");
  process.exit(1);
}
if (args.library && !LIBRARIES.has(args.library)) {
  console.error(`--library must be one of: ${[...LIBRARIES].join(", ")}`);
  process.exit(1);
}
const appUrl = (
  args.local
    ? "http://localhost:3000"
    : process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://greengptadvisory.com"
).replace(/\/$/, "");

if (!existsSync(RAG_DIR)) {
  console.error(`Folder not found: ${RAG_DIR}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (args.index && (!supabaseUrl || !serviceKey)) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const allFiles = walkFiles(RAG_DIR);
let candidates = allFiles.map((full) => {
  const rel = relative(RAG_DIR, full).replace(/\\/g, "/");
  const ext = (rel.split(".").pop() || "").toLowerCase();
  return { full, rel, ext, objectKey: args.org ? `orgs/${args.org}/${rel}` : rel };
});

if (args.filter) {
  candidates = candidates.filter((f) => f.rel.toLowerCase().includes(args.filter));
}

const supported = candidates.filter((f) => SUPPORTED.has(f.ext));
const skipped = candidates.filter((f) => !SUPPORTED.has(f.ext));

console.log(`RAG folder: ${RAG_DIR}`);
console.log(`Index API:  ${appUrl}/api/index-now`);
console.log(
  args.org
    ? `Tenancy:    client org ${args.org}${args.facility ? `, facility ${args.facility}` : ""} (${args.approved ? "approved" : "draft — not searchable until approved"})`
    : `Tenancy:    shared library (visible to every organization) · library ${args.library ?? "by folder"}${
        args.jurisdiction ? ` · jurisdiction ${args.jurisdiction}` : ""
      }`
);
console.log(`Total files: ${allFiles.length}`);
console.log(`Supported for indexing: ${supported.length}`);
if (skipped.length) {
  console.log(`Skipped (unsupported type): ${skipped.length}`);
  for (const s of skipped) console.log(`  - ${s.rel} (.${s.ext})`);
}

const toProcess = supported.slice(0, args.limit);
console.log(`Will process: ${toProcess.length}${args.index ? "" : " (dry-run — pass --index to upload)"}`);

if (!args.index) {
  for (const f of toProcess.slice(0, 20)) console.log(`  ${f.objectKey}`);
  if (toProcess.length > 20) console.log(`  … and ${toProcess.length - 20} more`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey);
let ok = 0;
let fail = 0;

for (const file of toProcess) {
  process.stdout.write(`\n[${ok + fail + 1}/${toProcess.length}] ${file.rel} … `);

  try {
    if (!args.skipUpload) {
      const body = readFileSync(file.full);
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(file.objectKey, body, {
        contentType: contentType(file.ext),
        upsert: true,
      });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
    }

    const catalog = args.org
      ? {}
      : { library: sharedLibraryFor(file.rel), ...(args.jurisdiction ? { jurisdiction: args.jurisdiction } : {}) };
    const documentId = await registerDocument(supabase, file.objectKey, catalog);
    if (args.org) {
      await tagClientDocument(supabase, {
        documentId,
        org: args.org,
        facility: args.facility,
        approved: args.approved,
        title: file.rel.split("/").pop().replace(/\.[^.]+$/, ""),
        fileType: file.ext,
        objectKey: file.objectKey,
      });
    }

    const res = await fetch(`${appUrl}/api/index-now`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      body: JSON.stringify({ documentId }),
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`index-now ${res.status}: ${text.slice(0, 300)}`);
    }
    if (!res.ok || parsed.ok === false) {
      const hint =
        parsed.message?.includes("LlamaParse") && parsed.message?.includes("401")
          ? " (set LLAMA_CLOUD_API_KEY on Vercel or use --local with dev server)"
          : "";
      throw new Error((parsed.message || parsed.error || text.slice(0, 200)) + hint);
    }
    console.log(`OK (${parsed.chunks ?? "?"} chunks)`);
    ok++;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} indexed, ${fail} failed`);
process.exit(fail ? 1 : 0);
