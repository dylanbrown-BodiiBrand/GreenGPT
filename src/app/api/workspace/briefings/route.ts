export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logWorkspaceAudit } from "@/lib/workspace/audit";
import { buildBriefingContent } from "@/lib/workspace/briefingBuilder";
import {
  assertFacilityAccess,
  listMembershipsForUser,
  requireOrgMembership,
} from "@/lib/workspace/membership";
import { parseReviewStateUpdate } from "@/lib/workspace/parsers";
import { requireEditor } from "@/lib/workspace/roles";
import type { CorrectiveActionRow, EvidenceItemRow, ObligationRow } from "@/lib/workspace/types";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const facilityId =
      typeof body.facilityId === "string" && body.facilityId.trim() ? body.facilityId.trim() : null;
    const periodLabel =
      typeof body.periodLabel === "string" && body.periodLabel.trim()
        ? body.periodLabel.trim().slice(0, 80)
        : new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

    const memberships = await listMembershipsForUser(user);
    if (!memberships[0]) {
      return NextResponse.json(
        { error: "No organization membership. Provision a client org before generating live briefings." },
        { status: 403 }
      );
    }

    let organizationId = memberships[0].organizationId;
    let organizationName = memberships[0].organizationName;
    let facilityName: string | null = null;

    if (facilityId) {
      const access = await assertFacilityAccess(user, facilityId);
      organizationId = access.organizationId;
      facilityName = access.facilityName;
      const m = await requireOrgMembership(user, organizationId);
      organizationName = m.organizationName;
    }

    const membership = requireEditor(await requireOrgMembership(user, organizationId));
    const supabase = await createSupabaseServerClient();

    const today = new Date().toISOString().slice(0, 10);
    const in45 = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);

    let obligationsQuery = supabase
      .from("obligations")
      .select(
        "id, organization_id, facility_id, title, source_document, source_citation, jurisdiction, frequency, owner_name, evidence_required, status, review_state, next_due_at, notes"
      )
      .eq("organization_id", organizationId)
      .lte("next_due_at", in45)
      .order("next_due_at")
      .limit(20);
    if (facilityId) obligationsQuery = obligationsQuery.eq("facility_id", facilityId);

    let actionsQuery = supabase
      .from("corrective_actions")
      .select(
        "id, organization_id, facility_id, finding, description, owner_name, due_date, priority, evidence_required, evidence_link, status, reviewer_name, notes, source_references"
      )
      .eq("organization_id", organizationId)
      .neq("status", "closed")
      .limit(30);
    if (facilityId) actionsQuery = actionsQuery.eq("facility_id", facilityId);

    let evidenceQuery = supabase
      .from("evidence_items")
      .select(
        "id, organization_id, facility_id, title, required_proof, status, last_reviewed_at, notes"
      )
      .eq("organization_id", organizationId)
      .eq("status", "missing")
      .limit(20);
    if (facilityId) evidenceQuery = evidenceQuery.eq("facility_id", facilityId);

    const [{ data: obligations }, { data: actions }, { data: evidence }] = await Promise.all([
      obligationsQuery,
      actionsQuery,
      evidenceQuery,
    ]);

    const content = buildBriefingContent({
      periodLabel,
      organizationName,
      facilityName,
      obligations: (obligations ?? []) as ObligationRow[],
      actions: (actions ?? []) as CorrectiveActionRow[],
      evidence: (evidence ?? []) as EvidenceItemRow[],
    });

    const title = facilityName
      ? `Monthly compliance briefing — ${facilityName} — ${periodLabel}`
      : `Monthly compliance briefing — ${periodLabel}`;

    const { data, error } = await supabase
      .from("compliance_briefings")
      .insert({
        organization_id: organizationId,
        facility_id: facilityId,
        period_label: periodLabel,
        title,
        content,
        review_state: "draft",
        created_by_email: user.email,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to save briefing draft." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId,
      entityType: "compliance_briefing",
      entityId: data.id,
      action: "generated",
      toState: "draft",
      metadata: { role: membership.role, periodLabel, asOf: today },
    });

    return NextResponse.json({ ok: true, briefing: data });
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
    const body = await req.json().catch(() => ({}));
    const parsed = parseReviewStateUpdate(body);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: existing, error: loadErr } = await supabase
      .from("compliance_briefings")
      .select("id, organization_id, review_state")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Briefing not found." }, { status: 404 });
    }

    const membership = requireEditor(
      await requireOrgMembership(user, existing.organization_id as string)
    );

    const { data, error } = await supabase
      .from("compliance_briefings")
      .update({
        review_state: parsed.data.reviewState,
        reviewer_name: parsed.data.reviewerName || user.email,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to update briefing review state." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId: existing.organization_id as string,
      entityType: "compliance_briefing",
      entityId: parsed.data.id,
      action: "review_state_changed",
      fromState: existing.review_state as string,
      toState: parsed.data.reviewState,
      metadata: { role: membership.role },
    });

    return NextResponse.json({ ok: true, briefing: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
