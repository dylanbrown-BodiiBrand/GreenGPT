import type { OrgRole } from "./types";
import type { Membership } from "./membership";
import { HttpError } from "@/lib/auth/httpError";
import type { HumanPrincipal, JobFunction } from "./agent/types";
import type { SessionUser } from "@/lib/auth/requireSessionUser";

const EDITOR_ROLES: OrgRole[] = ["owner", "admin", "editor"];

export function canEditWorkspace(role: string): boolean {
  return EDITOR_ROLES.includes(role as OrgRole);
}

export function requireEditor(membership: Membership): Membership {
  if (!canEditWorkspace(membership.role)) {
    throw new HttpError(403, "Editor access required for this action.");
  }
  return membership;
}

export function mapOrgRoleToJobFunction(role: string): JobFunction {
  if (role === "owner" || role === "admin") return "ehs_manager";
  if (role === "editor") return "facility_admin";
  return "employee";
}

export function canManageAgents(jobFunction: JobFunction): boolean {
  return jobFunction === "ehs_manager";
}

export function canApproveAgentProposals(jobFunction: JobFunction): boolean {
  return jobFunction === "ehs_manager" || jobFunction === "facility_admin";
}

export function canActAtFacility(
  scopedFacilityIds: string[] | null,
  facilityId: string | null
): boolean {
  if (!facilityId) return scopedFacilityIds === null;
  if (scopedFacilityIds === null) return true;
  return scopedFacilityIds.includes(facilityId);
}

export function toHumanPrincipal(
  user: SessionUser,
  membership: Membership,
  facilityIds: string[] | null = null
): HumanPrincipal {
  return {
    kind: "human",
    userId: user.id,
    email: user.email,
    organizationId: membership.organizationId,
    orgRole: membership.role as OrgRole,
    jobFunction: mapOrgRoleToJobFunction(membership.role),
    facilityIds,
  };
}

export function requireManager(membership: Membership): Membership {
  if (!canManageAgents(mapOrgRoleToJobFunction(membership.role))) {
    throw new HttpError(403, "EHS manager access required to manage agents.");
  }
  return membership;
}
