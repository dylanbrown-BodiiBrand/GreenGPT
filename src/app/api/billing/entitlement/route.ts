export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  try {
    const user = await requireSessionUser();

    const { data, error } = await supabase
      .from("subscriptions")
      .select("tier,status,updated_at")
      .eq("customer_email", user.email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Unable to load subscription status." }, { status: 500 });
    }

    if (!data) return NextResponse.json({ tier: "free", status: "none" });
    return NextResponse.json({
      tier: data.tier ?? "free",
      status: data.status ?? "none",
      updatedAt: data.updated_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized.";
    return NextResponse.json({ error: message }, { status: httpStatusFromError(err, 401) });
  }
}
