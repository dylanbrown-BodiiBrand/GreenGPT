export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logWorkspaceAudit } from "@/lib/workspace/audit";
import {
  ardrFilename,
  buildArdrWorkbook,
  workbookToBuffer,
} from "@/lib/workspace/ardrExport";
import {
  assertFacilityAccess,
  listMembershipsForUser,
  requireOrgMembership,
} from "@/lib/workspace/membership";
import { PILOT_PREVIEW } from "@/lib/workspace/sampleWorkspace";
import type {
  CorrectiveActionRow,
  EvidenceItemRow,
  FacilityRow,
  ObligationRow,
} from "@/lib/workspace/types";

/**
 * Export ARDR-shaped .xlsx snapshot for a facility.
 * Workspace remains system of record for status, evidence, and CAPs.
 *
 * Query: facilityId (optional if org has a single facility)
 * Query: preview=1 → sample pilot workbook (session required)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const facilityId = req.nextUrl.searchParams.get("facilityId")?.trim() || null;
    const wantPreview = req.nextUrl.searchParams.get("preview") === "1";

    if (wantPreview) {
      const facility = PILOT_PREVIEW.facilities[0];
      const wb = await buildArdrWorkbook({
        organizationName: PILOT_PREVIEW.organizationName ?? "Sample",
        facility,
        preparedBy: user.email,
        obligations: PILOT_PREVIEW.upcomingObligations,
        actions: [...PILOT_PREVIEW.overdueActions, ...PILOT_PREVIEW.awaitingReview],
        evidence: PILOT_PREVIEW.missingEvidence,
        preview: true,
      });
      const buf = await workbookToBuffer(wb);
      const name = ardrFilename(facility.name);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const memberships = await listMembershipsForUser(user);
    if (!memberships[0]) {
      return NextResponse.json(
        {
          error:
            "No organization membership. Provision a client org, or export the pilot preview with ?preview=1.",
        },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseServerClient();
    let organizationId = memberships[0].organizationId;
    let organizationName = memberships[0].organizationName;
    let facility: FacilityRow | null = null;

    if (facilityId) {
      const access = await assertFacilityAccess(user, facilityId);
      organizationId = access.organizationId;
      organizationName = (await requireOrgMembership(user, organizationId)).organizationName;
      const { data, error } = await supabase
        .from("facilities")
        .select("id, organization_id, name, state, industry, employee_count, status")
        .eq("id", facilityId)
        .maybeSingle();
      if (error || !data) {
        return NextResponse.json({ error: "Facility not found." }, { status: 404 });
      }
      facility = data as FacilityRow;
    } else {
      await requireOrgMembership(user, organizationId);
      const { data: facilities } = await supabase
        .from("facilities")
        .select("id, organization_id, name, state, industry, employee_count, status")
        .eq("organization_id", organizationId)
        .order("name")
        .limit(2);
      if (!facilities?.length) {
        return NextResponse.json({ error: "No facilities provisioned for this organization." }, { status: 404 });
      }
      if (facilities.length > 1) {
        return NextResponse.json(
          { error: "Multiple facilities — pass facilityId to export ARDR." },
          { status: 400 }
        );
      }
      facility = facilities[0] as FacilityRow;
    }

    if (!facility) {
      return NextResponse.json({ error: "Facility not found." }, { status: 404 });
    }

    const [{ data: obligations }, { data: actions }, { data: evidence }] = await Promise.all([
      supabase
        .from("obligations")
        .select(
          "id, organization_id, facility_id, title, source_document, source_citation, jurisdiction, frequency, owner_name, evidence_required, status, review_state, next_due_at, notes"
        )
        .eq("organization_id", organizationId)
        .eq("facility_id", facility.id)
        .order("next_due_at", { ascending: true, nullsFirst: false })
        .limit(500),
      supabase
        .from("corrective_actions")
        .select(
          "id, organization_id, facility_id, finding, description, owner_name, due_date, priority, evidence_required, evidence_link, status, reviewer_name, notes, source_references"
        )
        .eq("organization_id", organizationId)
        .eq("facility_id", facility.id)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(500),
      supabase
        .from("evidence_items")
        .select(
          "id, organization_id, facility_id, title, required_proof, status, last_reviewed_at, notes"
        )
        .eq("organization_id", organizationId)
        .eq("facility_id", facility.id)
        .limit(500),
    ]);

    const wb = await buildArdrWorkbook({
      organizationName,
      facility,
      preparedBy: user.email,
      obligations: (obligations ?? []) as ObligationRow[],
      actions: (actions ?? []) as CorrectiveActionRow[],
      evidence: (evidence ?? []) as EvidenceItemRow[],
    });
    const buf = await workbookToBuffer(wb);
    const name = ardrFilename(facility.name);

    await logWorkspaceAudit(user, {
      organizationId,
      entityType: "ardr_export",
      entityId: facility.id,
      action: "export",
      metadata: {
        facilityId: facility.id,
        obligationCount: obligations?.length ?? 0,
        actionCount: actions?.length ?? 0,
        evidenceCount: evidence?.length ?? 0,
        filename: name,
      },
    });

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const status = httpStatusFromError(err);
    const message = err instanceof Error ? err.message : "ARDR export failed.";
    return NextResponse.json({ error: message }, { status });
  }
}
