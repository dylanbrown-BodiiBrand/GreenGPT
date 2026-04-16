// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // anon key; RLS controls access
);

function isValidEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clampText(raw: unknown, maxLen: number): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = clampText(body?.name, 120);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const company = clampText(body?.company, 120);
    const phone = clampText(body?.phone, 40);
    const message = clampText(body?.message, 4000);

    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });

    const { error } = await supabase.from("contact_submissions").insert({
      name,
      email,
      company: company ?? null,
      phone: phone ?? null,
      message,
      source: "home",
    });

    if (error) {
      // If you add a UNIQUE constraint on email+created_at, you can treat duplicates as success:
      // if (error.code === "23505") return NextResponse.json({ ok: true });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
