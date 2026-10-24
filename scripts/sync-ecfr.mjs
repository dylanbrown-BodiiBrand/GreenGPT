/**
 * Sync curated federal regulations from the eCFR into the shared library (spec §3.6).
 * Each target becomes regulations/federal/<title>-CFR-<part>[...].md in rag-source,
 * tagged library=regulation, jurisdiction=federal, version_date=<eCFR issue date>, then indexed.
 *
 * Usage:
 *   node scripts/sync-ecfr.mjs                       # dry-run (list targets and issue dates)
 *   node scripts/sync-ecfr.mjs --index               # fetch, upload, and index via production API
 *   node scripts/sync-ecfr.mjs --index --local       # use http://localhost:3000 (dev server)
 *   node scripts/sync-ecfr.mjs --index --filter 112  # only targets whose key contains "112"
 *
 * Re-run monthly: unchanged text keeps its chunks; amended text is re-indexed.
 * Env (from .env.local): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
 */
import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const BUCKET = "rag-source";
const ECFR = "https://www.ecfr.gov/api/versioner/v1";

/** Core federal EHS requirements for industrial and manufacturing facilities. */
const TARGETS = [
  { title: 29, part: "1904", name: "OSHA injury and illness recordkeeping" },
  ...["D", "E", "H", "I", "J", "L", "N", "O", "S"].map((subpart) => ({
    title: 29,
    part: "1910",
    subpart,
    name: `OSHA general industry Subpart ${subpart}`,
  })),
  { title: 29, part: "1910", section: "1910.1000", name: "OSHA air contaminants" },
  { title: 29, part: "1910", section: "1910.1200", name: "OSHA hazard communication" },
  { title: 40, part: "60", subpart: "A", name: "NSPS general provisions" },
  { title: 40, part: "63", subpart: "A", name: "NESHAP general provisions" },
  { title: 40, part: "68", name: "Risk management programs" },
  { title: 40, part: "70", name: "State operating permit programs (Title V)" },
  { title: 40, part: "82", subpart: "F", name: "Refrigerant management" },
  { title: 40, part: "112", name: "Oil pollution prevention (SPCC)" },
  { title: 40, part: "122", subpart: "B", name: "NPDES permit applications and stormwater" },
  { title: 40, part: "262", name: "Hazardous waste generators" },
  { title: 40, part: "273", name: "Universal waste" },
  { title: 40, part: "279", name: "Used oil" },
  { title: 40, part: "302", name: "CERCLA reportable quantities" },
  { title: 40, part: "355", name: "EPCRA emergency planning and notification" },
  { title: 40, part: "370", name: "EPCRA hazardous chemical reporting (Tier II)" },
  { title: 40, part: "372", name: "Toxic chemical release reporting (TRI)" },
  { title: 40, part: "403", name: "Pretreatment for indirect dischargers" },
  { title: 49, part: "171", name: "Hazmat general information" },
  ...["C", "D", "E", "H"].map((subpart) => ({
    title: 49,
    part: "172",
    subpart,
    name: `Hazmat communications Subpart ${subpart}`,
  })),
];

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

function parseArgs(argv) {
  const args = { index: false, local: false, filter: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--index") args.index = true;
    else if (a === "--local") args.local = true;
    else if (a === "--filter") args.filter = (argv[++i] || "").toLowerCase();
  }
  return args;
}

const targetKey = (t) =>
  `${t.title}-CFR-${t.part}${t.subpart ? `-subpart-${t.subpart}` : ""}${t.section ? `-section-${t.section}` : ""}`;

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const strip = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** One H1 per section so chunks align to sections; every paragraph carries its citation. */
function ecfrXmlToMarkdown(xml, title, heading) {
  const out = [`# ${heading}`];
  for (const sec of xml.matchAll(/<DIV8 N="([^"]+)"[^>]*>([\s\S]*?)<\/DIV8>/g)) {
    const cite = `${title} CFR ${sec[1]}`;
    const head = strip((sec[2].match(/<HEAD>([\s\S]*?)<\/HEAD>/) || [])[1] || "").replace(/^§+\s*[\w.-]+\s*/, "");
    out.push("", `# ${cite} — ${head}`);
    for (const el of sec[2].matchAll(/<(P|FP|TR)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const text =
        el[1] === "TR"
          ? [...el[2].matchAll(/<T[DH]\b[^>]*>([\s\S]*?)<\/T[DH]>/g)].map((c) => strip(c[1])).join(" | ")
          : strip(el[2]);
      if (text && text.replace(/[|\s]/g, "")) out.push(`[${cite}] ${text}`);
    }
  }
  return out.length > 1 ? out.join("\n") : "";
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function registerDocument(supabase, objectKey, markdown, versionDate) {
  const content_hash = createHash("sha256").update(markdown).digest("hex");
  const filename = objectKey.split("/").pop();
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
  const catalog = { library: "regulation", jurisdiction: "federal", version_date: versionDate };

  const { data: existing, error: selErr } = await supabase
    .from("documents")
    .select("id, content_hash, status")
    .eq("object_key", objectKey)
    .maybeSingle();
  if (selErr) throw new Error(`db select: ${selErr.message}`);

  if (!existing) {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        title: filename.replace(/\.md$/, ""),
        filename,
        file_type: "md",
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
    return { documentId: data.id, changed: true };
  }

  const changed = existing.content_hash !== content_hash || existing.status !== "ready";
  const { error } = await supabase
    .from("documents")
    .update({ ...catalog, ...(changed ? { content_hash, status: "pending" } : {}) })
    .eq("id", existing.id);
  if (error) throw new Error(`db update: ${error.message}`);
  return { documentId: existing.id, changed };
}

loadEnvLocal();
const args = parseArgs(process.argv);
const appUrl = (
  args.local
    ? "http://localhost:3000"
    : process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://greengptadvisory.com"
).replace(/\/$/, "");

const titlesRes = await fetch(`${ECFR}/titles.json`);
if (!titlesRes.ok) {
  console.error(`eCFR titles.json: HTTP ${titlesRes.status}`);
  process.exit(1);
}
const issueDates = new Map((await titlesRes.json()).titles.map((t) => [t.number, t.latest_issue_date]));

const targets = TARGETS.filter((t) => !args.filter || targetKey(t).toLowerCase().includes(args.filter));
console.log(`Index API: ${appUrl}/api/index-now`);
console.log(`Targets: ${targets.length}${args.index ? "" : " (dry-run — pass --index to sync)"}`);
for (const t of targets) console.log(`  ${targetKey(t)} · ${t.name} · eCFR ${issueDates.get(t.title)}`);
if (!args.index) process.exit(0);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
let ok = 0;
let fail = 0;

for (const t of targets) {
  const key = targetKey(t);
  const date = issueDates.get(t.title);
  process.stdout.write(`\n[${ok + fail + 1}/${targets.length}] ${key} … `);
  try {
    const params = new URLSearchParams({ part: t.part });
    if (t.subpart) params.set("subpart", t.subpart);
    if (t.section) params.set("section", t.section);
    const res = await fetch(`${ECFR}/full/${date}/title-${t.title}.xml?${params}`);
    if (!res.ok) throw new Error(`eCFR HTTP ${res.status}`);
    const heading = `${t.title} CFR ${t.section ?? `Part ${t.part}${t.subpart ? ` Subpart ${t.subpart}` : ""}`} — ${
      t.name
    } (eCFR as of ${date})`;
    const markdown = ecfrXmlToMarkdown(await res.text(), t.title, heading);
    if (!markdown) throw new Error("eCFR returned no sections (retry later)");

    const objectKey = `regulations/federal/${key}.md`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectKey, Buffer.from(markdown, "utf8"), { contentType: "text/markdown", upsert: true });
    if (upErr) throw new Error(`upload: ${upErr.message}`);

    const { documentId, changed } = await registerDocument(supabase, objectKey, markdown, date);
    if (!changed) {
      console.log("unchanged");
      ok++;
      continue;
    }

    const idx = await fetch(`${appUrl}/api/index-now`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      body: JSON.stringify({ documentId }),
    });
    const text = await idx.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`index-now ${idx.status}: ${text.slice(0, 300)}`);
    }
    if (!idx.ok || parsed.ok === false) throw new Error(parsed.message || parsed.error || text.slice(0, 200));
    console.log(`OK (${parsed.chunks ?? "?"} chunks, ${Math.round(markdown.length / 1024)} KB)`);
    ok++;
  } catch (err) {
    console.log(`FAIL — ${err.message}`);
    fail++;
  }
  await pause(1000);
}

console.log(`\nDone: ${ok} synced, ${fail} failed`);
process.exit(fail ? 1 : 0);
