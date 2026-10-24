import type { AgentActionEvent, AuthzResult, SupportingSource } from "./types";
import { deny, allow } from "./authorization";

export function emptySourcesMarker(): SupportingSource[] {
  return [{ filename: "(none)", excerpt: "No supporting sources were retrieved for this action." }];
}

export function normalizeSources(sources: SupportingSource[] | undefined | null): SupportingSource[] {
  if (!sources || sources.length === 0) return emptySourcesMarker();
  return sources;
}

export function validateActionEventCompleteness(event: {
  toolName?: string | null;
  supportingSources?: SupportingSource[] | null;
}): AuthzResult {
  if (!event.toolName || !event.toolName.trim()) {
    return deny("AUDIT_INCOMPLETE", "Agent action event is missing the tool name.");
  }
  if (!event.supportingSources || event.supportingSources.length === 0) {
    return deny("AUDIT_INCOMPLETE", "Agent action event is missing supporting information.");
  }
  return allow();
}

export function isDualActorApply(event: Pick<AgentActionEvent, "agentId" | "authorizedByUserId" | "approvalStatus">): boolean {
  return (
    event.approvalStatus === "approved" &&
    Boolean(event.agentId) &&
    Boolean(event.authorizedByUserId)
  );
}
