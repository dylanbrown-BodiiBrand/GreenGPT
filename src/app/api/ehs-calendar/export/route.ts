export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildEhsCalendarIcs } from "@/lib/ehs-calendar/buildIcs";
import { parseEhsProfile, isValidEmail } from "@/lib/ehs-calendar/profile";
import { RULES, genEvents } from "@/lib/ehs-calendar/rulesEngine";
import { getSupabase } from "@/lib/server/supabase";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured.", requestId }, { status: 503 });
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required for export.", requestId }, { status: 400 });
    }

    const entitlement = await supabase
      .from("subscriptions")
      .select("tier")
      .eq("customer_email", email)
      .maybeSingle();

    if (entitlement.error) {
      return NextResponse.json({ error: entitlement.error.message, requestId }, { status: 500 });
    }
    if (entitlement.data?.tier !== "pro") {
      return NextResponse.json({ error: "Pro subscription required for export.", requestId }, { status: 403 });
    }

    const parsed = parseEhsProfile(body);
    if (!parsed.profile) {
      return NextResponse.json({ error: parsed.error ?? "Invalid profile.", requestId }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const events = genEvents(
      RULES,
      parsed.profile.industry,
      parsed.profile.jurisdictions,
      parsed.profile.flags,
      parsed.profile.employees
    );
    const ics = buildEhsCalendarIcs(events, year);
    console.info(`[ehs.export] requestId=${requestId} email=${email} events=${events.length}`);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="ehs-compliance-calendar-${year}.ics"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Bad request.", requestId }, { status: 400 });
  }
}
