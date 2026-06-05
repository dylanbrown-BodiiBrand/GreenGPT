/**
 * Verify enterprise tier entitlement on production (temporary Supabase row).
 * Usage: node scripts/verify-enterprise-tier.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const TEST_EMAIL = "workflow-enterprise-verify@greengptadvisory.com";
const BASE = (process.env.BASE_URL || "https://greengptadvisory.com").replace(/\/$/, "");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabase(method, path, body) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "resolution=merge-duplicates" : "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }
}

async function main() {
  console.log("\nEnterprise tier verification\n");

  await supabase("POST", "subscriptions", {
    customer_email: TEST_EMAIL,
    tier: "enterprise",
    status: "active",
    updated_at: new Date().toISOString(),
  });

  const entRes = await fetch(`${BASE}/api/billing/entitlement?email=${encodeURIComponent(TEST_EMAIL)}`);
  const ent = await entRes.json();
  const ok = entRes.ok && ent.tier === "enterprise" && ent.status === "active";
  console.log(`[${ok ? "PASS" : "FAIL"}] Entitlement API (Enterprise) — tier=${ent.tier} status=${ent.status}`);

  const profile = {
    email: TEST_EMAIL,
    industry: "manufacturing",
    jurisdictions: ["CA"],
    flags: [],
    employees: 50,
  };
  const exp = await fetch(`${BASE}/api/ehs-calendar/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const expText = await exp.text();
  console.log(
    `[${exp.ok && expText.includes("BEGIN:VCALENDAR") ? "PASS" : "FAIL"}] Export .ics (Enterprise) — HTTP ${exp.status}`
  );

  await supabase("DELETE", `subscriptions?customer_email=eq.${encodeURIComponent(TEST_EMAIL)}`);

  if (!ok) process.exit(1);
  console.log("\nEnterprise tier OK (test row removed)\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
