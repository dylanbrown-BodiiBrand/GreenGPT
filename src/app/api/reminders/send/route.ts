export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { hasProAccess } from "@/lib/billing/tier";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const BUCKET_DAYS = [30, 60, 90] as const;
type Bucket = (typeof BUCKET_DAYS)[number];

function daysUntil(isoDate: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(`${isoDate}T00:00:00.000Z`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function flagForBucket(bucket: Bucket): "reminded_30" | "reminded_60" | "reminded_90" {
  if (bucket === 30) return "reminded_30";
  if (bucket === 60) return "reminded_60";
  return "reminded_90";
}

export async function GET(req: NextRequest) {
  return runReminderJob(req);
}

export async function POST(req: NextRequest) {
  return runReminderJob(req);
}

async function runReminderJob(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized.", requestId }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!supabase || !apiKey || !from) {
    return NextResponse.json({ error: "Reminders not configured.", requestId }, { status: 503 });
  }

  const { data: rows, error } = await supabase.from("deadline_reminders").select("*");
  if (error) {
    return NextResponse.json({ error: error.message, requestId }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  let sent = 0;

  for (const row of rows ?? []) {
    const until = daysUntil(row.deadline_date);
    const bucket = BUCKET_DAYS.find((b) => b === until);
    if (!bucket) continue;

    const flag = flagForBucket(bucket);
    if (row[flag]) continue;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tier,status")
      .eq("customer_email", row.user_email)
      .maybeSingle();

    if (!hasProAccess(sub?.tier)) continue;

    const { error: sendErr } = await resend.emails.send({
      from,
      to: row.user_email,
      subject: `EHS reminder: ${row.obligation_name} in ${bucket} days`,
      text: [
        `This is your ${bucket}-day reminder for an upcoming EHS compliance deadline.`,
        "",
        `Obligation: ${row.obligation_name}`,
        `Due date: ${row.deadline_date}`,
        "",
        "— The Green Executive Briefing",
        "https://greengptadvisory.com",
      ].join("\n"),
    });

    if (sendErr) continue;

    await supabase.from("deadline_reminders").update({ [flag]: true }).eq("id", row.id);
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, requestId });
}
