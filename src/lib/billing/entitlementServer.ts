import type { SupabaseClient } from "@supabase/supabase-js";
import { type BillingTier, hasProAccess } from "./tier";

export type EntitlementRecord = {
  tier: BillingTier;
  status: string;
};

export async function getEntitlementForEmail(
  supabase: SupabaseClient,
  email: string
): Promise<EntitlementRecord> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("tier,status")
    .eq("customer_email", email)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { tier: "free", status: "none" };

  const tier = (data.tier as BillingTier) ?? "free";
  const status = data.status ?? "none";
  return { tier, status };
}

export async function requireProEmail(
  supabase: SupabaseClient,
  email: string
): Promise<EntitlementRecord> {
  const ent = await getEntitlementForEmail(supabase, email);
  if (!hasProAccess(ent.tier)) {
    const err = new Error("Pro subscription required.");
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
  return ent;
}
