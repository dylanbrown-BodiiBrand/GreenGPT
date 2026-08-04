export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logWorkspaceAudit } from "@/lib/workspace/audit";
import { assertFacilityAccess, requireOrgMembership } from "@/lib/workspace/membership";
import { parseUpdateEvidence } from "@/lib/workspace/parsers";
import { requireEditor } from "@/lib/workspace/roles";

export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const facilityId = typeof body.facilityId === "string" ? body.facilityId.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
    const requiredProof =
      typeof body.requiredProof === "string" ? body.requiredProof.trim().slice(0, 500) : "";

    if (!facilityId) return NextResponse.json({ error: "facilityId is required." }, { status: 400 });
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const access = await assertFacilityAccess(user, facilityId);
    const membership = requireEditor(await requireOrgMembership(user, access.organizationId));
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("evidence_items")
      .insert({
        organization_id: access.organizationId,
        facility_id: facilityId,
        title,
        required_proof: requiredProof || null,
        status: "missing",
        notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to create evidence item." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId: access.organizationId,
      entityType: "evidence_item",
      entityId: data.id,
      action: "created",
      toState: "missing",
      metadata: { role: membership.role, title },
    });

    return NextResponse.json({ ok: true, evidence: data });
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
    const parsed = parseUpdateEvidence(body);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: existing, error: loadErr } = await supabase
      .from("evidence_items")
      .select("id, organization_id, status")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (loadErr || !existing) {
      return NextResponse.json({ error: "Evidence item not found." }, { status: 404 });
    }

    const membership = requireEditor(
      await requireOrgMembership(user, existing.organization_id as string)
    );

    const patch: Record<string, unknown> = {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes || null;
    if (parsed.data.filePath !== undefined) patch.file_path = parsed.data.filePath || null;
    if (parsed.data.status === "reviewed" || parsed.data.status === "audit_ready") {
      patch.last_reviewed_at = new Date().toISOString().slice(0, 10);
    }

    const { data, error } = await supabase
      .from("evidence_items")
      .update(patch)
      .eq("id", parsed.data.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to update evidence item." }, { status: 500 });
    }

    await logWorkspaceAudit(user, {
      organizationId: existing.organization_id as string,
      entityType: "evidence_item",
      entityId: parsed.data.id,
      action: "updated",
      fromState: existing.status as string,
      toState: parsed.data.status,
      metadata: { role: membership.role },
    });

    return NextResponse.json({ ok: true, evidence: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
