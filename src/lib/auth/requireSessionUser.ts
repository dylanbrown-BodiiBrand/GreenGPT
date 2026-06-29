import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HttpError } from "./httpError";

export type SessionUser = {
  id: string;
  email: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  return { id: user.id, email: user.email.trim().toLowerCase() };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Sign in required.");
  return user;
}
