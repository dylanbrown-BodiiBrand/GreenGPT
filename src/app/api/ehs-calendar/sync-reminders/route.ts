export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireProSession } from "@/lib/auth/requireProSession";
import { eventsToReminderRows } from "@/lib/ehs-calendar/deadlineDates";
import { parseEhsProfile } from "@/lib/ehs-calendar/profile";
import { RULES, genEvents } from "@/lib/ehs-calendar/rulesEngine";
import { httpStatusFromError } from "@/lib/auth/httpError";
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
    const rows = eventsToReminderRows(events, year, user.email);

    let synced = 0;
    for (const row of rows) {
      const { data: existing } = await supabase
        .from("deadline_reminders")
        .select("id")
        .eq("user_email", row.user_email)
        .eq("obligation_id", row.obligation_id)
        .eq("deadline_date", row.deadline_date)
        .maybeSingle();

      if (existing?.id) {
        const { error: updateErr } = await supabase
          .from("deadline_reminders")
          .update({ obligation_name: row.obligation_name })
          .eq("id", existing.id);
        if (updateErr) {
          return NextResponse.json({ error: "Unable to sync reminders.", requestId }, { status: 500 });
        }
      } else {
        const { error: insertErr } = await supabase.from("deadline_reminders").insert(row);
        if (insertErr) {
          return NextResponse.json({ error: "Unable to sync reminders.", requestId }, { status: 500 });
        }
        synced += 1;
      }
    }

    return NextResponse.json({ ok: true, synced, requestId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request.";
    return NextResponse.json({ error: message, requestId }, { status: httpStatusFromError(err, 400) });
  }
}
