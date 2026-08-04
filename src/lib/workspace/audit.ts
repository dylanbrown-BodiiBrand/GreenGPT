import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SessionUser } from "@/lib/auth/requireSessionUser";

export type AuditInput = {
  organizationId: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  fromState?: string | null;
  toState?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logWorkspaceAudit(user: SessionUser, input: AuditInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("workspace_audit_events").insert({
    organization_id: input.organizationId,
    actor_user_id: user.id,
    actor_email: user.email,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    from_state: input.fromState ?? null,
    to_state: input.toState ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.warn("[workspace.audit] failed to write audit event:", error.message);
  }
}
