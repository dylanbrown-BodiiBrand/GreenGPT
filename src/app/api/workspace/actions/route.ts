export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logWorkspaceAudit } from "@/lib/workspace/audit";
import { assertFacilityAccess, requireOrgMembership } from "@/lib/workspace/membership";
import { parseCreateAction, parseUpdateAction } from "@/lib/workspace/parsers";
import { requireEditor } from "@/lib/workspace/roles";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const parsed = parseCreateAction(body);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const access = await assertFacilityAccess(user, parsed.data.facilityId);
    const membership = requireEditor(await requireOrgMembership(user, access.organizationId));

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("corrective_actions")
      .insert({
        organization_id: access.organizationId,
        facility_id: parsed.data.facilityId,
        finding: parsed.data.finding,
        description: parsed.data.description || null,
        owner_name: parsed.data.ownerName || null,
        due_date: parsed.data.dueDate || null,
        priority: parsed.data.priority,
        evidence_required: parsed.data.evidenceRequired || null,
        source_references: parsed.data.sourceReferences || null,
        notes: parsed.data.notes || null,
        status: "open",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to create corrective action." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId: access.organizationId,
      entityType: "corrective_action",
      entityId: data.id,
      action: "created",
      toState: "open",
      metadata: { role: membership.role, finding: parsed.data.finding },
    });

    return NextResponse.json({ ok: true, action: data });
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
    const parsed = parseUpdateAction(body);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: existing, error: loadErr } = await supabase
      .from("corrective_actions")
      .select("id, organization_id, status")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }

    const membership = requireEditor(
      await requireOrgMembership(user, existing.organization_id as string)
    );

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.status) patch.status = parsed.data.status;
    if (parsed.data.ownerName !== undefined) patch.owner_name = parsed.data.ownerName || null;
    if (parsed.data.dueDate !== undefined) patch.due_date = parsed.data.dueDate || null;
    if (parsed.data.evidenceLink !== undefined) patch.evidence_link = parsed.data.evidenceLink || null;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes || null;
    if (parsed.data.reviewerName !== undefined) {
      patch.reviewer_name = parsed.data.reviewerName || user.email;
      patch.reviewed_at = new Date().toISOString();
    }
    if (parsed.data.status === "closed" && !parsed.data.reviewerName) {
      patch.reviewer_name = user.email;
      patch.reviewed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("corrective_actions")
      .update(patch)
      .eq("id", parsed.data.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to update corrective action." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId: existing.organization_id as string,
      entityType: "corrective_action",
      entityId: parsed.data.id,
      action: "updated",
      fromState: existing.status as string,
      toState: (data.status as string) ?? existing.status,
      metadata: { role: membership.role },
    });

    return NextResponse.json({ ok: true, action: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
