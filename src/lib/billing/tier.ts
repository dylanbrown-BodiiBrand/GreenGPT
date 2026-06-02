export type BillingTier = "free" | "pro" | "enterprise";

export function hasProAccess(tier: BillingTier | string | null | undefined): boolean {
  return tier === "pro" || tier === "enterprise";
}

export function isEnterpriseTier(tier: BillingTier | string | null | undefined): boolean {
  return tier === "enterprise";
}
