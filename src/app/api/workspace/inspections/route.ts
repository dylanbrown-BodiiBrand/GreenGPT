export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logWorkspaceAudit } from "@/lib/workspace/audit";
import { assertFacilityAccess, requireOrgMembership } from "@/lib/workspace/membership";
import { parseCreateInspection, parseReviewStateUpdate } from "@/lib/workspace/parsers";
import { requireEditor } from "@/lib/workspace/roles";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const parsed = parseCreateInspection(body);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const access = await assertFacilityAccess(user, parsed.data.facilityId);
    const membership = requireEditor(await requireOrgMembership(user, access.organizationId));
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("inspection_preps")
      .insert({
        organization_id: access.organizationId,
        facility_id: parsed.data.facilityId,
        title: parsed.data.title,
        inspection_type: parsed.data.inspectionType,
        scheduled_for: parsed.data.scheduledFor || null,
        summary: parsed.data.summary || null,
        checklist: parsed.data.checklist,
        review_state: "draft",
        created_by_email: user.email,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to create inspection prep." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId: access.organizationId,
      entityType: "inspection_prep",
      entityId: data.id,
      action: "created",
      toState: "draft",
      metadata: { role: membership.role, title: parsed.data.title },
    });

    return NextResponse.json({ ok: true, inspection: data });
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

    // Checklist update or review transition
    if (body?.checklist && body?.id) {
      const id = String(body.id);
      const supabase = await createSupabaseServerClient();
      const { data: existing, error: loadErr } = await supabase
        .from("inspection_preps")
        .select("id, organization_id, review_state")
        .eq("id", id)
        .maybeSingle();
      if (loadErr || !existing) {
        return NextResponse.json({ error: "Inspection prep not found." }, { status: 404 });
      }
      const membership = requireEditor(
        await requireOrgMembership(user, existing.organization_id as string)
      );
      const { data, error } = await supabase
        .from("inspection_preps")
        .update({
          checklist: body.checklist,
          summary: typeof body.summary === "string" ? body.summary.slice(0, 4000) : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        return NextResponse.json({ error: "Unable to update inspection prep." }, { status: 500 });
      }
      await logWorkspaceAudit(user, {
        organizationId: existing.organization_id as string,
        entityType: "inspection_prep",
        entityId: id,
        action: "checklist_updated",
        fromState: existing.review_state as string,
        toState: existing.review_state as string,
        metadata: { role: membership.role },
      });
      return NextResponse.json({ ok: true, inspection: data });
    }

    const parsed = parseReviewStateUpdate(body);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: existing, error: loadErr } = await supabase
      .from("inspection_preps")
      .select("id, organization_id, review_state")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (loadErr || !existing) {
      return NextResponse.json({ error: "Inspection prep not found." }, { status: 404 });
    }

    const membership = requireEditor(
      await requireOrgMembership(user, existing.organization_id as string)
    );

    const { data, error } = await supabase
      .from("inspection_preps")
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
      return NextResponse.json({ error: "Unable to update review state." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId: existing.organization_id as string,
      entityType: "inspection_prep",
      entityId: parsed.data.id,
      action: "review_state_changed",
      fromState: existing.review_state as string,
      toState: parsed.data.reviewState,
      metadata: { role: membership.role },
    });

    return NextResponse.json({ ok: true, inspection: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
