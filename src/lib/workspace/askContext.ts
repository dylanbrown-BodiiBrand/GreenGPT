import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntakeFormData } from "@/lib/managed-compliance/intake";
import { loadToolContext } from "./agent/runtime";
import { PILOT_PREVIEW } from "./sampleWorkspace";
import type { CorrectiveActionRow, EvidenceItemRow, FacilityRow, ObligationRow } from "./types";

/** Read-only facility context for Ask (spec §3.6): profile, intake answers, and live register. */
export type AskFacilityContext = {
  label: string;
  facility: Pick<FacilityRow, "name" | "state" | "industry" | "employee_count">;
  intake: Partial<IntakeFormData> | null;
  obligations: ObligationRow[];
  actions: CorrectiveActionRow[];
  evidence: EvidenceItemRow[];
};

const MAX_OBLIGATIONS = 25;
const MAX_ITEMS = 15;

export async function loadAskContext(
  supabase: SupabaseClient,
  organizationId: string,
  organizationName: string,
  facilityId: string
): Promise<AskFacilityContext | null> {
  const { data: facility } = await supabase
    .from("facilities")
    .select("id, organization_id, name, state, industry, employee_count, intake_id")
    .eq("id", facilityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!facility) return null;

  let intake: Partial<IntakeFormData> | null = null;
  if (facility.intake_id) {
    const { data } = await supabase
      .from("facility_intakes")
      .select("payload")
      .eq("id", facility.intake_id)
      .maybeSingle();
    intake = (data?.payload as Partial<IntakeFormData> | undefined) ?? null;
  }

  const records = await loadToolContext(supabase, organizationId, organizationName, facilityId, facility.name);
  return {
    label: "Workspace register (live)",
    facility,
    intake,
    obligations: records.obligations,
    actions: records.actions,
    evidence: records.evidence,
  };
}

export function previewAskContext(): AskFacilityContext {
  return {
    label: "Pilot preview sample data",
    facility: PILOT_PREVIEW.facilities[0],
    intake: null,
    obligations: PILOT_PREVIEW.upcomingObligations,
    actions: [...PILOT_PREVIEW.overdueActions, ...PILOT_PREVIEW.awaitingReview],
    evidence: PILOT_PREVIEW.missingEvidence,
  };
}

const list = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).join(", ") : typeof v === "string" ? v : "");

export function formatAskContext(ctx: AskFacilityContext, today: string): string {
  const f = ctx.facility;
  const lines = [
    `Source: ${ctx.label}.`,
    `Facility: ${[f.name, f.state, f.industry, f.employee_count ? `${f.employee_count} employees` : ""]
      .filter(Boolean)
      .join(" · ")}`,
  ];

  if (ctx.intake) {
    const i = ctx.intake;
    const site = [
      ["NAICS", i.naics],
      ["Shifts", i.shifts],
      ["Permits", list(i.permits)],
      ["Hazards", list(i.hazards)],
      ["Chemicals", i.chemicals],
      ["Waste streams", i.waste_streams],
      ["Equipment", i.equipment],
      ["Inspection / audit history", i.audit_history],
      ["Current tracking", i.current_system],
    ]
      .filter(([, v]) => typeof v === "string" && v.trim())
      .map(([k, v]) => `- ${k}: ${String(v).trim().slice(0, 400)}`);
    if (site.length) lines.push("Site details from the diagnostic intake:", ...site);
  }

  const obligations = [...ctx.obligations]
    .sort((a, b) => (a.next_due_at ?? "9999").localeCompare(b.next_due_at ?? "9999"))
    .slice(0, MAX_OBLIGATIONS);
  lines.push(`Obligation register (${ctx.obligations.length} row(s); showing ${obligations.length} by due date):`);
  for (const o of obligations) {
    const overdue = o.next_due_at && o.next_due_at < today ? "[OVERDUE] " : "";
    lines.push(
      `- ${overdue}${o.title} — ${o.source_citation ?? "no citation"} — due ${o.next_due_at ?? "unscheduled"} — ${
        o.frequency ?? "frequency n/a"
      } — owner ${o.owner_name ?? "unassigned"} — review ${o.review_state}`
    );
  }
  if (!obligations.length) lines.push("- (no obligations in the register yet)");

  const actions = ctx.actions.slice(0, MAX_ITEMS);
  lines.push(`Open corrective actions (${ctx.actions.length}):`);
  for (const a of actions) {
    lines.push(
      `- ${a.finding} — ${a.status} — ${a.priority} priority — due ${a.due_date ?? "unscheduled"} — owner ${
        a.owner_name ?? "unassigned"
      }`
    );
  }
  if (!actions.length) lines.push("- (none)");

  const evidence = ctx.evidence.slice(0, MAX_ITEMS);
  lines.push(`Missing evidence (${ctx.evidence.length}):`);
  for (const e of evidence) lines.push(`- ${e.title} — required: ${e.required_proof ?? "proof"}`);
  if (!evidence.length) lines.push("- (none)");

  return lines.join("\n");
}
