import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth/requireSessionUser";

export async function requireWorkspaceUser(nextPath = "/workspace"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}
