export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireProEmail } from "@/lib/billing/entitlementServer";
import { eventsToReminderRows } from "@/lib/ehs-calendar/deadlineDates";
import { isValidEmail, parseEhsProfile } from "@/lib/ehs-calendar/profile";
import { RULES, genEvents } from "@/lib/ehs-calendar/rulesEngine";
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
      return NextResponse.json({ error: "Valid email is required.", requestId }, { status: 400 });
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
    const rows = eventsToReminderRows(events, year, email);

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
          return NextResponse.json({ error: updateErr.message, requestId }, { status: 500 });
        }
      } else {
        const { error: insertErr } = await supabase.from("deadline_reminders").insert(row);
        if (insertErr) {
          return NextResponse.json({ error: insertErr.message, requestId }, { status: 500 });
        }
        synced += 1;
      }
    }

    return NextResponse.json({ ok: true, synced, requestId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request.";
    const status =
      err instanceof Error && "statusCode" in err && (err as Error & { statusCode: number }).statusCode === 403
        ? 403
        : 400;
    return NextResponse.json({ error: message, requestId }, { status });
  }
}
