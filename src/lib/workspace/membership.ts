import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/requireSessionUser";
import { HttpError } from "@/lib/auth/httpError";

export type Membership = {
  organizationId: string;
  organizationName: string;
  role: string;
  email: string;
};

export async function listMembershipsForUser(user: SessionUser): Promise<Membership[]> {
  const supabase = await createSupabaseServerClient();

  const byUser = await supabase
    .from("organization_members")
    .select("organization_id, role, email, organizations(name)")
    .eq("user_id", user.id);

  const byEmail = await supabase
    .from("organization_members")
    .select("organization_id, role, email, organizations(name)")
    .ilike("email", user.email);

  const error = byUser.error || byEmail.error;
  if (error) {
    if (error.message?.includes("does not exist") || error.code === "42P01") return [];
    throw new HttpError(500, "Unable to load workspace membership.");
  }

  const merged = new Map<string, Membership>();
  for (const row of [...(byUser.data ?? []), ...(byEmail.data ?? [])]) {
    const org = row.organizations as { name?: string } | { name?: string }[] | null;
    const name = Array.isArray(org) ? org[0]?.name : org?.name;
    merged.set(row.organization_id as string, {
      organizationId: row.organization_id as string,
      organizationName: name ?? "Organization",
      role: row.role as string,
      email: row.email as string,
    });
  }
  return Array.from(merged.values());
}

export async function requireOrgMembership(
  user: SessionUser,
  organizationId: string
): Promise<Membership> {
  const memberships = await listMembershipsForUser(user);
  const match = memberships.find((m) => m.organizationId === organizationId);
  if (!match) throw new HttpError(403, "Not a member of this organization.");
  return match;
}

export async function assertFacilityAccess(
  user: SessionUser,
  facilityId: string
): Promise<{ organizationId: string; facilityName: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("id, name, organization_id")
    .eq("id", facilityId)
    .maybeSingle();

  if (error || !data) throw new HttpError(404, "Facility not found.");
  await requireOrgMembership(user, data.organization_id as string);
  return {
    organizationId: data.organization_id as string,
    facilityName: data.name as string,
  };
}
