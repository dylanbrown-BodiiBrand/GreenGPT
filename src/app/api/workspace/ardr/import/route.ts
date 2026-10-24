export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { executeAgentRun } from "@/lib/workspace/agent/runtime";
import { parseArdrWorkbook } from "@/lib/workspace/ardrImport";
import { assertFacilityAccess, requireOrgMembership } from "@/lib/workspace/membership";
import { canApproveAgentProposals, mapOrgRoleToJobFunction, toHumanPrincipal } from "@/lib/workspace/roles";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload a human-completed ARDR for one facility. The agent proposes obligation rows
 * (Applies? Yes/TBD only); nothing reaches the register until a human approves each proposal.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    const form = await req.formData();
    const facilityId = String(form.get("facilityId") ?? "").trim();
    const file = form.get("file");

    if (!facilityId) {
      return NextResponse.json({ error: "facilityId is required — an ARDR covers one facility." }, { status: 400 });
    }
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Upload a completed ARDR .xlsx file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be 5 MB or smaller." }, { status: 400 });
    }

    const access = await assertFacilityAccess(user, facilityId);
    const membership = await requireOrgMembership(user, access.organizationId);
    if (!canApproveAgentProposals(mapOrgRoleToJobFunction(membership.role))) {
      return NextResponse.json(
        { error: "Employees cannot import an ARDR. Ask an EHS manager or facility administrator." },
        { status: 403 }
      );
    }

    let rows;
    try {
      rows = await parseArdrWorkbook(Buffer.from(await file.arrayBuffer()));
    } catch {
      return NextResponse.json({ error: "Unable to read this workbook as an ARDR." }, { status: 400 });
    }
    if (!rows.length) {
      return NextResponse.json(
        { error: "No ARDR requirement rows found. Use the GreenGPT ARDR template or an ARDR export." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const executed = await executeAgentRun({
      supabase,
      human: toHumanPrincipal(user, membership),
      organizationId: access.organizationId,
      organizationName: membership.organizationName,
      facilityId,
      facilityName: access.facilityName,
      trigger: "ardr_import",
      tools: ["import_ardr"],
      ardrRows: rows,
      ardrFilename: file.name.slice(0, 200),
    });
    if (!executed.result.ok) {
      const status = executed.result.code === "AGENT_NOT_FOUND" ? 409 : 403;
      return NextResponse.json({ error: executed.result.message, code: executed.result.code }, { status });
    }

    return NextResponse.json({
      ok: true,
      runId: executed.runId,
      proposalCount: executed.proposalCount ?? 0,
      rowsRead: rows.length,
      notApplicable: rows.filter((r) => r.applies === "no").length,
      notAssessed: rows.filter((r) => r.applies === "blank").length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ARDR import failed." },
      { status: httpStatusFromError(err, 500) }
    );
  }
}
