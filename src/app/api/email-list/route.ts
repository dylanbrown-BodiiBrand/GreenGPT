// app/api/email-list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // anon key; RLS controls access
);

function isValidEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  // simple RFC-5322-ish sanity check
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();

    // Insert new row. If you add a UNIQUE constraint on email, you can switch to upsert.
    const { error } = await supabase
      .from("email_list")
      .insert({ email: normalized });

    if (error) {
      // If you later add a UNIQUE constraint on email, treat duplicates as success:
      // if (error.code === "23505") return NextResponse.json({ ok: true });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}

export async function OPTIONS() {
  // allow preflight if you ever post from other origins
  return NextResponse.json({}, { status: 200 });
}
