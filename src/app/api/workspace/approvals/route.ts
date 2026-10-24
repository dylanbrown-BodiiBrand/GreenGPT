export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAgentCannotApprove } from "@/lib/workspace/agent/authorization";
import { getAgent, getProposal, listPendingProposals } from "@/lib/workspace/agent/persist";
import { decideAndApply } from "@/lib/workspace/agent/runtime";
import { logWorkspaceAudit } from "@/lib/workspace/audit";
import { listMembershipsForUser, requireOrgMembership } from "@/lib/workspace/membership";
import { toHumanPrincipal } from "@/lib/workspace/roles";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const memberships = await listMembershipsForUser(user);
    if (!memberships[0]) {
      return NextResponse.json({ proposals: [] });
    }
    const human = toHumanPrincipal(user, memberships[0]);
    const supabase = await createSupabaseServerClient();
    const proposals = await listPendingProposals(supabase, memberships[0].organizationId);
    return NextResponse.json({ ok: true, proposals, jobFunction: human.jobFunction });
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
    const body = await req.json().catch(() => ({}));
    const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
    const decision = body.decision === "denied" ? "denied" : body.decision === "approved" ? "approved" : null;
    if (!proposalId || !decision) {
      return NextResponse.json({ error: "proposalId and decision are required." }, { status: 400 });
    }

    const self = assertAgentCannotApprove({ kind: "human" });
    if (!self.ok) {
      return NextResponse.json({ error: self.message, code: self.code }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const proposal = await getProposal(supabase, proposalId);
    if (!proposal) return NextResponse.json({ error: "Proposal not found." }, { status: 404 });

    const membership = await requireOrgMembership(user, proposal.organizationId);
    const human = toHumanPrincipal(user, membership);
    const agent = await getAgent(supabase, proposal.agentId);
    if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

    const result = await decideAndApply({ supabase, proposal, agent, human, decision });
    if (!result.ok) {
      return NextResponse.json({ error: result.message, code: result.code }, { status: 403 });
    }

    await logWorkspaceAudit(user, {
      organizationId: proposal.organizationId,
      entityType: "agent_proposal",
      entityId: proposal.id,
      action: decision === "approved" ? "agent_proposal_approved" : "agent_proposal_denied",
      fromState: "pending",
      toState: decision,
      metadata: {
        role: membership.role,
        jobFunction: human.jobFunction,
        agentId: agent.id,
        kind: proposal.kind,
      },
    });

    return NextResponse.json({ ok: true, decision });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
