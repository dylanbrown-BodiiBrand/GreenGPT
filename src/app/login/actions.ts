"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  error?: string;
  success?: string;
};

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/").trim() || "/";

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createSupabaseServerClient();
  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const redirectTo = `${origin.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Check your inbox for the sign-in link." };
}
