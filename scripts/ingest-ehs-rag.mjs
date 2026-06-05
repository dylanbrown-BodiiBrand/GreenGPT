/**
 * Bulk-upload local "ehs rag docs" files to Supabase rag-source and index them.
 *
 * The local folder is NOT watched automatically — this script is the bridge.
 *
 * Usage:
 *   node scripts/ingest-ehs-rag.mjs                  # dry-run (list files)
 *   node scripts/ingest-ehs-rag.mjs --index          # upload + POST /api/register-file
 *   node scripts/ingest-ehs-rag.mjs --index --limit 1
 *   node scripts/ingest-ehs-rag.mjs --index --filter "permit to work"
 *   node scripts/ingest-ehs-rag.mjs --index --skip-upload   # re-index keys already in storage
 *
 * Env (from .env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: APP_URL (default https://greengptadvisory.com) for register-file calls
 */
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const RAG_DIR = resolve(root, "ehs rag docs");
const BUCKET = "rag-source";
const SUPPORTED = new Set(["pdf", "docx", "xlsx", "csv"]);

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
  };
  return map[ext] || "application/octet-stream";
}

function parseArgs(argv) {
  const args = { index: false, skipUpload: false, limit: Infinity, filter: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--index") args.index = true;
    else if (a === "--skip-upload") args.skipUpload = true;
    else if (a === "--limit") args.limit = Number(argv[++i]) || 1;
    else if (a === "--filter") args.filter = (argv[++i] || "").toLowerCase();
  }
  return args;
}

loadEnvLocal();

const args = parseArgs(process.argv);
const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://greengptadvisory.com").replace(/\/$/, "");

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
  return { full, rel, ext, objectKey: rel };
});

if (args.filter) {
  candidates = candidates.filter((f) => f.rel.toLowerCase().includes(args.filter));
}

const supported = candidates.filter((f) => SUPPORTED.has(f.ext));
const skipped = candidates.filter((f) => !SUPPORTED.has(f.ext));

console.log(`RAG folder: ${RAG_DIR}`);
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

    const res = await fetch(`${appUrl}/api/register-file`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objectKey: file.objectKey }),
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`register-file ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!res.ok || parsed.ok === false) {
      throw new Error(parsed.message || parsed.error || text.slice(0, 200));
    }
    const chunks = parsed.indexResult?.chunks ?? "?";
    console.log(`OK (${chunks} chunks)`);
    ok++;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} indexed, ${fail} failed`);
process.exit(fail ? 1 : 0);
