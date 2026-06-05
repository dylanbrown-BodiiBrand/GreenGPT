/**
 * Audit production env by probing APIs (no secret values printed).
 * Usage: node scripts/verify-vercel-env.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const examplePath = resolve(root, ".env.example");

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const BASE = (process.env.BASE_URL || "https://greengptadvisory.com").replace(/\/$/, "");
const PRO_EMAIL = process.env.PRO_TEST_EMAIL || "dylanbrown416@gmail.com";

const REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "CRON_SECRET",
];

const OPTIONAL = ["STRIPE_ENTERPRISE_PRICE_ID", "NEXT_PUBLIC_STRIPE_PRO_PAYMENT_LINK", "OPENAI_API_KEY"];

async function probe(name, fn) {
  try {
    const { ok, detail } = await fn();
    console.log(`[${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
    return ok;
  } catch (e) {
    console.log(`[FAIL] ${name} — ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`\nVercel env audit (probes against ${BASE})\n`);

  const exampleKeys = readFileSync(examplePath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => l.split("=")[0].trim());

  console.log(".env.example keys:", exampleKeys.join(", "));
  console.log("\nLocal .env.local presence (for deploy parity, not Vercel dashboard):\n");
  for (const key of [...REQUIRED, ...OPTIONAL]) {
    const val = process.env[key];
    const present = !!val && val.length > 0;
    console.log(`  ${present ? "✓" : "○"} ${key}${OPTIONAL.includes(key) ? " (optional)" : ""}`);
  }

  console.log("\nProduction API probes:\n");

  const profile = {
    email: PRO_EMAIL,
    industry: "manufacturing",
    jurisdictions: ["CA"],
    flags: [],
    employees: 50,
  };

  const results = [];

  results.push(
    await probe("SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY", async () => {
      const r = await fetch(`${BASE}/api/billing/entitlement?email=${encodeURIComponent(PRO_EMAIL)}`);
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok && j.tier, detail: r.ok ? `tier=${j.tier}` : `HTTP ${r.status}` };
    })
  );

  results.push(
    await probe("STRIPE_SECRET_KEY + STRIPE_PRO_PRICE_ID + NEXT_PUBLIC_APP_URL", async () => {
      const r = await fetch(`${BASE}/api/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: PRO_EMAIL }),
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok && !!j.url, detail: r.ok ? "checkout url" : j.error || `HTTP ${r.status}` };
    })
  );

  results.push(
    await probe("RESEND_API_KEY + RESEND_FROM", async () => {
      const r = await fetch(`${BASE}/api/ehs-calendar/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const j = await r.json().catch(() => ({}));
      const ok = r.ok || (r.status !== 503 && r.status !== 502);
      return { ok: r.ok, detail: r.ok ? "email sent" : j.error || `HTTP ${r.status}` };
    })
  );

  results.push(
    await probe("CRON_SECRET", async () => {
      const secret = process.env.CRON_SECRET;
      if (!secret) return { ok: false, detail: "CRON_SECRET not in .env.local" };
      const r = await fetch(`${BASE}/api/reminders/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok, detail: r.ok ? `sent=${j.sent}` : j.error || `HTTP ${r.status}` };
    })
  );

  results.push(
    await probe("STRIPE_WEBHOOK_SECRET (webhook endpoint reachable)", async () => {
      const r = await fetch(`${BASE}/api/billing/webhook`, { method: "POST", body: "{}" });
      return { ok: r.status === 400 || r.status === 401 || r.status === 403, detail: `HTTP ${r.status} (expects signature error, not 503)` };
    })
  );

  results.push(
    await probe("STRIPE_ENTERPRISE_PRICE_ID (optional)", async () => {
      const id = process.env.STRIPE_ENTERPRISE_PRICE_ID;
      return { ok: true, detail: id ? "set locally" : "not set — enterprise maps via webhook when configured" };
    })
  );

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} production probes passed`);
  if (passed < results.length - 1) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
