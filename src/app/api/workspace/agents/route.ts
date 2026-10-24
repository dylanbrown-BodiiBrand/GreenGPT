export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCanManageAgent, assertCanRevoke } from "@/lib/workspace/agent/authorization";
import { getAgent, insertActionEvent, insertAgent, listAgents, revokeAgentRow } from "@/lib/workspace/agent/persist";
import { listMembershipsForUser } from "@/lib/workspace/membership";
import { requireManager, toHumanPrincipal } from "@/lib/workspace/roles";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const memberships = await listMembershipsForUser(user);
    if (!memberships[0]) {
      return NextResponse.json({ agents: [], jobFunction: null });
    }
    const membership = memberships[0];
    const human = toHumanPrincipal(user, membership);
    const supabase = await createSupabaseServerClient();
    const agents = await listAgents(supabase, membership.organizationId);
    return NextResponse.json({
      ok: true,
      agents,
      jobFunction: human.jobFunction,
      organizationId: membership.organizationId,
      organizationName: membership.organizationName,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const memberships = await listMembershipsForUser(user);
    if (!memberships[0]) {
      return NextResponse.json({ error: "No organization membership." }, { status: 403 });
    }
    const membership = requireManager(memberships[0]);
    const human = toHumanPrincipal(user, membership);
    const body = await req.json().catch(() => ({}));
    const organizationId = membership.organizationId;
    const authz = assertCanManageAgent(human, organizationId);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.message, code: authz.code }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const facilityIds = Array.isArray(body.facilityIds)
      ? body.facilityIds.filter((id: unknown) => typeof id === "string")
      : null;
    const agent = await insertAgent(supabase, human, organizationId, {
      name: typeof body.name === "string" ? body.name.slice(0, 120) : undefined,
      facilityIds: facilityIds?.length ? facilityIds : null,
    });
    await insertActionEvent(supabase, {
      organizationId,
      runId: null,
      agentId: agent.id,
      proposalId: null,
      toolName: "provision_agent",
      inputs: { name: agent.name },
      supportingSources: [
        { filename: "Control specification", excerpt: "EHS manager delegated a named agent." },
      ],
      proposedChange: { before: null, after: { status: "active" } },
      approvalStatus: "not_required",
      authorizedByUserId: human.userId,
      authorizedByEmail: human.email,
      appliedEntityType: "workspace_agent",
      appliedEntityIds: [agent.id],
    });
    return NextResponse.json({ ok: true, agent });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const memberships = await listMembershipsForUser(user);
    if (!memberships[0]) {
      return NextResponse.json({ error: "No organization membership." }, { status: 403 });
    }
    const membership = requireManager(memberships[0]);
    const human = toHumanPrincipal(user, membership);
    const body = await req.json().catch(() => ({}));
    const agentId = typeof body.agentId === "string" ? body.agentId : "";
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Revoked by EHS manager";
    if (!agentId) return NextResponse.json({ error: "agentId is required." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const agent = await getAgent(supabase, agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    const authz = assertCanRevoke(human, agent);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.message, code: authz.code }, { status: 403 });
    }
    await revokeAgentRow(supabase, agent, human, reason);
    await insertActionEvent(supabase, {
      organizationId: agent.organizationId,
      runId: null,
      agentId: agent.id,
      proposalId: null,
      toolName: "revoke_agent",
      inputs: { reason },
      supportingSources: [{ filename: "Revocation record", excerpt: reason }],
      proposedChange: { before: { status: agent.status }, after: { status: "revoked" } },
      approvalStatus: "not_required",
      authorizedByUserId: human.userId,
      authorizedByEmail: human.email,
      appliedEntityType: "workspace_agent",
      appliedEntityIds: [agent.id],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
