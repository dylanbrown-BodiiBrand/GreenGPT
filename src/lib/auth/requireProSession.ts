import { requireProEmail, type EntitlementRecord } from "@/lib/billing/entitlementServer";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { HttpError } from "./httpError";
import { requireSessionUser, type SessionUser } from "./requireSessionUser";

export type ProSession = {
  user: SessionUser;
  entitlement: EntitlementRecord;
};

export async function requireProSession(): Promise<ProSession> {
  const user = await requireSessionUser();
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new HttpError(503, "Database is not configured.");
  const entitlement = await requireProEmail(supabase, user.email);
  return { user, entitlement };
}
