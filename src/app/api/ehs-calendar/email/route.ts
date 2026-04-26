export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  RULES,
  genEvents,
  VALID_FLAG_IDS,
  VALID_INDUSTRY_IDS,
  VALID_JURISDICTION_IDS,
} from "@/lib/ehs-calendar/rulesEngine";
import { buildEhsCalendarIcs } from "@/lib/ehs-calendar/buildIcs";

const FLAG_SET = new Set<string>(VALID_FLAG_IDS);
const JUR_SET = new Set<string>(VALID_JURISDICTION_IDS);
const INDUSTRY_SET = new Set<string>(VALID_INDUSTRY_IDS);

function isValidEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY / RESEND_FROM)." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const industry = typeof body?.industry === "string" ? body.industry : "";
    const jurisdictions = Array.isArray(body?.jurisdictions) ? body.jurisdictions : [];
    const flags = Array.isArray(body?.flags) ? body.flags : [];
    const employeesRaw = body?.employees;

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    if (!INDUSTRY_SET.has(industry)) {
      return NextResponse.json({ error: "Invalid industry." }, { status: 400 });
    }
    if (!jurisdictions.every((j: unknown) => typeof j === "string" && JUR_SET.has(j))) {
      return NextResponse.json({ error: "Invalid jurisdictions." }, { status: 400 });
    }
    if (!flags.every((f: unknown) => typeof f === "string" && FLAG_SET.has(f))) {
      return NextResponse.json({ error: "Invalid facility flags." }, { status: 400 });
    }

    let employees = 50;
    if (typeof employeesRaw === "number" && Number.isFinite(employeesRaw)) {
      employees = Math.min(500, Math.max(1, Math.floor(employeesRaw)));
    }

    const events = genEvents(RULES, industry, jurisdictions as string[], flags as string[], employees);
    const year = new Date().getFullYear();
    const ics = buildEhsCalendarIcs(events, year);

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
