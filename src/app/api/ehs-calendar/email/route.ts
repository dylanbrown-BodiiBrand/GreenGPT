export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  RULES,
  genEvents,
} from "@/lib/ehs-calendar/rulesEngine";
import { buildEhsCalendarIcs } from "@/lib/ehs-calendar/buildIcs";
import { isValidEmail, parseEhsProfile } from "@/lib/ehs-calendar/profile";
import { getSupabase } from "@/lib/server/supabase";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  const requestId = crypto.randomUUID();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY / RESEND_FROM).", requestId },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email.", requestId }, { status: 400 });
    }

    const parsed = parseEhsProfile(body);
    if (!parsed.profile) {
      return NextResponse.json({ error: parsed.error ?? "Invalid profile.", requestId }, { status: 400 });
    }

    const events = genEvents(
      RULES,
      parsed.profile.industry,
      parsed.profile.jurisdictions,
      parsed.profile.flags,
      parsed.profile.employees
    );
    const year = new Date().getFullYear();
    const ics = buildEhsCalendarIcs(events, year);

    const resend = new Resend(apiKey);
    const sendPromise = resend.emails.send({
        from,
        to: email,
        subject: `Your EHS compliance calendar (${year})`,
        text: [
          "Attached is your personalized EHS compliance calendar (.ics).",
          "",
          `Open or import the file in Outlook, Google Calendar, or Apple Calendar.`,
          "",
          `This file was generated for calendar year ${year} based on your facility profile in The Green Executive Briefing tool.`,
        ].join("\n"),
        attachments: [
          {
            filename: `ehs-compliance-calendar-${year}.ics`,
            content: Buffer.from(ics, "utf-8"),
          },
        ],
      });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Email provider timeout.")), 12000)
    );

    const result = await Promise.race([sendPromise, timeoutPromise]);
    const { error, data } = result;

    if (error) {
      if (supabase) {
        await supabase.from("calendar_email_sends").insert({
          request_id: requestId,
          email,
          status: "failed",
          provider_message_id: null,
          error_message: error.message,
        });
      }
      return NextResponse.json({ error: `Email provider error: ${error.message}`, requestId }, { status: 502 });
    }

    if (supabase) {
      await supabase.from("calendar_email_sends").insert({
        request_id: requestId,
        email,
        status: "sent",
        provider_message_id: data?.id ?? null,
        error_message: null,
      });
    }
    console.info(`[ehs.email] requestId=${requestId} email=${email} messageId=${data?.id ?? "none"}`);

    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Bad request.";
    const status = errorMessage.includes("timeout") ? 504 : 400;
    return NextResponse.json({ error: errorMessage, requestId }, { status });
  }
}
