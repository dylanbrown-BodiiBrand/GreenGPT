export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildEhsCalendarIcs } from "@/lib/ehs-calendar/buildIcs";
import { parseEhsProfile, isValidEmail } from "@/lib/ehs-calendar/profile";
import { RULES, genEvents } from "@/lib/ehs-calendar/rulesEngine";
import { requireProEmail } from "@/lib/billing/entitlementServer";
import { eventsToReminderRows } from "@/lib/ehs-calendar/deadlineDates";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured.", requestId }, { status: 503 });
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required for export.", requestId }, { status: 400 });
    }

    await requireProEmail(supabase, email);

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

    const reminderRows = eventsToReminderRows(events, year, email);
    for (const row of reminderRows) {
      const { data: existing } = await supabase
        .from("deadline_reminders")
        .select("id")
        .eq("user_email", row.user_email)
        .eq("obligation_id", row.obligation_id)
        .eq("deadline_date", row.deadline_date)
        .maybeSingle();
      if (!existing?.id) {
        await supabase.from("deadline_reminders").insert(row);
      }
    }

    console.info(`[ehs.export] requestId=${requestId} email=${email} events=${events.length}`);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="ehs-compliance-calendar-${year}.ics"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request.";
    const status =
      err instanceof Error && "statusCode" in err && (err as Error & { statusCode: number }).statusCode === 403
        ? 403
        : 400;
    return NextResponse.json({ error: message, requestId }, { status });
  }
}
