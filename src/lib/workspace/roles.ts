import type { OrgRole } from "./types";
import type { Membership } from "./membership";
import { HttpError } from "@/lib/auth/httpError";

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
