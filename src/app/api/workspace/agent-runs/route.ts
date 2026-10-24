export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { executeAgentRun } from "@/lib/workspace/agent/runtime";
import type { ToolName } from "@/lib/workspace/agent/tools";
import { assertFacilityAccess, listMembershipsForUser, requireOrgMembership } from "@/lib/workspace/membership";
import { canApproveAgentProposals, mapOrgRoleToJobFunction, toHumanPrincipal } from "@/lib/workspace/roles";

const ALLOWED_TOOLS = new Set<ToolName>(["identify_deadlines", "propose_tasks", "prepare_records"]);

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const memberships = await listMembershipsForUser(user);
    if (!memberships[0]) {
      return NextResponse.json({ error: "No organization membership." }, { status: 403 });
    }

    const facilityId =
      typeof body.facilityId === "string" && body.facilityId.trim() ? body.facilityId.trim() : null;
    let organizationId = memberships[0].organizationId;
    let organizationName = memberships[0].organizationName;
    let facilityName: string | null = null;

    if (facilityId) {
      const access = await assertFacilityAccess(user, facilityId);
      organizationId = access.organizationId;
      facilityName = access.facilityName;
      const membership = await requireOrgMembership(user, organizationId);
      organizationName = membership.organizationName;
    }

    const membership = await requireOrgMembership(user, organizationId);
    const human = toHumanPrincipal(user, membership);
    if (!canApproveAgentProposals(mapOrgRoleToJobFunction(membership.role))) {
      return NextResponse.json(
        { error: "Employees cannot start agent runs. Ask an EHS manager or facility administrator." },
        { status: 403 }
      );
    }

    const trigger =
      typeof body.trigger === "string" && body.trigger.trim()
        ? body.trigger.trim().slice(0, 80)
        : "workspace_run";
    const tools = Array.isArray(body.tools)
      ? (body.tools.filter((t: unknown) => typeof t === "string" && ALLOWED_TOOLS.has(t as ToolName)) as ToolName[])
      : undefined;

    const supabase = await createSupabaseServerClient();
    const executed = await executeAgentRun({
      supabase,
      human,
      organizationId,
      organizationName,
      facilityId,
      facilityName,
      trigger,
      tools,
    });
    if (!executed.result.ok) {
      const status = executed.result.code === "AGENT_NOT_FOUND" ? 409 : 403;
      return NextResponse.json(
        { error: executed.result.message, code: executed.result.code },
        { status }
      );
    }
    return NextResponse.json({
      ok: true,
      runId: executed.runId,
      proposalCount: executed.proposalCount ?? 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
