export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { isValidEmail } from "@/lib/ehs-calendar/profile";
import { getSupabase } from "@/lib/server/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .select("tier,status,updated_at")
    .eq("customer_email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) return NextResponse.json({ tier: "free", status: "none" });
  return NextResponse.json({ tier: data.tier ?? "free", status: data.status ?? "none", updatedAt: data.updated_at });
}
