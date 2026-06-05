/**
 * Verify production Stripe checkout → webhook → subscriptions row.
 * Usage: node scripts/verify-stripe-e2e.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

const stripeKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const proEmail = (process.env.PRO_TEST_EMAIL || "dylanbrown416@gmail.com").toLowerCase();

if (!stripeKey?.startsWith("sk_") && !stripeKey?.startsWith("rk_")) {
  console.error("STRIPE_SECRET_KEY missing or invalid prefix");
  process.exit(1);
}

async function stripeGet(path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${stripeKey}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe HTTP ${res.status}`);
  return data;
}

async function supabaseGet(table, query) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log("\nStripe E2E verification\n");

  const subs = await supabaseGet(
    "subscriptions",
    `select=customer_email,tier,status,stripe_customer_id,stripe_subscription_id,updated_at&customer_email=eq.${encodeURIComponent(proEmail)}`
  );
  const row = subs[0];
  if (!row) {
    console.log("[FAIL] No subscriptions row for", proEmail);
    process.exit(1);
  }
  console.log("[PASS] Supabase subscriptions row:", {
    email: row.customer_email,
    tier: row.tier,
    status: row.status,
    hasStripeCustomer: !!row.stripe_customer_id,
    hasStripeSubscription: !!row.stripe_subscription_id,
  });

  const sessions = await stripeGet("/checkout/sessions?limit=10&expand[]=data.customer");
  const forEmail = (sessions.data || []).filter(
    (s) => s.customer_details?.email?.toLowerCase() === proEmail || s.customer_email?.toLowerCase() === proEmail
  );
  const completed = forEmail.filter((s) => s.status === "complete" && s.payment_status === "paid");
  console.log(
    `[${completed.length ? "PASS" : "WARN"}] Stripe checkout sessions for ${proEmail}: ${forEmail.length} total, ${completed.length} completed/paid`
  );

  const events = await stripeGet("/events?limit=25&type=checkout.session.completed");
  const webhookHits = (events.data || []).filter((e) => {
    const email = e.data?.object?.customer_details?.email?.toLowerCase();
    return email === proEmail;
  });
  console.log(
    `[${webhookHits.length ? "PASS" : "WARN"}] Recent checkout.session.completed events for ${proEmail}: ${webhookHits.length}`
  );

  if (row.stripe_customer_id) {
    try {
      const portal = await fetch("https://greengptadvisory.com/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: proEmail }),
      });
      const portalData = await portal.json();
      console.log(`[${portal.ok ? "PASS" : "FAIL"}] Billing portal API: HTTP ${portal.status}`, portal.ok ? "url ok" : portalData.error);
    } catch (e) {
      console.log("[FAIL] Billing portal API:", e.message);
    }
  }

  const ok =
    row.tier === "pro" &&
    row.status === "active" &&
    !!row.stripe_customer_id &&
    (completed.length > 0 || !!row.stripe_subscription_id);

  if (!ok) {
    console.log("\nE2E incomplete: need paid checkout + active pro row with Stripe IDs");
    process.exit(1);
  }
  console.log("\nStripe E2E: subscription backed by Stripe checkout data\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
