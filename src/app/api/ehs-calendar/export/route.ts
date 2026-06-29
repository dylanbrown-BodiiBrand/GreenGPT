export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { buildEhsCalendarIcs } from "@/lib/ehs-calendar/buildIcs";
import { parseEhsProfile } from "@/lib/ehs-calendar/profile";
import { RULES, genEvents } from "@/lib/ehs-calendar/rulesEngine";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireProSession } from "@/lib/auth/requireProSession";
import { eventsToReminderRows } from "@/lib/ehs-calendar/deadlineDates";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured.", requestId }, { status: 503 });
  }

  try {
    const { user } = await requireProSession();
    const body = await req.json();

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

    const reminderRows = eventsToReminderRows(events, year, user.email);
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

    console.info(`[ehs.export] requestId=${requestId} email=${user.email} events=${events.length}`);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="ehs-compliance-calendar-${year}.ics"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request.";
    return NextResponse.json({ error: message, requestId }, { status: httpStatusFromError(err, 400) });
  }
}
