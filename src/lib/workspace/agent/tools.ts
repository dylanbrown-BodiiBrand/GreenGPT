import { defaultInspectionChecklist, buildBriefingContent } from "../briefingBuilder";
import type { ArdrImportRow } from "../ardrImport";
import type { CorrectiveActionRow, EvidenceItemRow, ObligationRow } from "../types";
import {
  MAX_PROPOSALS_PER_RUN,
  MAX_REGISTER_PROPOSALS_PER_RUN,
  type AgentCapability,
  type ProposalKind,
  type ProposedChange,
  type SupportingSource,
} from "./types";
import { assertPayloadNotConsequentialWrite, assertProposalGrounded, forceDraftPayload } from "./authorization";

export type ToolName =
  | "identify_deadlines"
  | "propose_tasks"
  | "prepare_records"
  | "import_ardr"
  | "search_approved_corpus";

export type PlannedProposal = {
  kind: ProposalKind;
  capability: AgentCapability;
  facilityId: string | null;
  dedupeKey: string;
  payload: Record<string, unknown>;
  proposedChange: ProposedChange;
  supportingSources: SupportingSource[];
  toolName: ToolName;
};

export type ToolContext = {
  organizationId: string;
  organizationName: string;
  facilityId: string | null;
  facilityName: string | null;
  obligations: ObligationRow[];
  actions: CorrectiveActionRow[];
  evidence: EvidenceItemRow[];
  pendingDedupeKeys: string[];
  now: string;
  ardrRows?: ArdrImportRow[];
  ardrFilename?: string;
};

const TOOL_CAPABILITY: Record<Exclude<ToolName, "search_approved_corpus">, AgentCapability> = {
  identify_deadlines: "identify_deadlines",
  propose_tasks: "propose_tasks",
  prepare_records: "prepare_records",
  import_ardr: "populate_register",
};

export function capabilityForTool(tool: ToolName): AgentCapability | null {
  if (tool === "search_approved_corpus") return null;
  return TOOL_CAPABILITY[tool];
}

export function proposalCapForTool(tool: ToolName): number {
  return tool === "import_ardr" ? MAX_REGISTER_PROPOSALS_PER_RUN : MAX_PROPOSALS_PER_RUN;
}

function daysFromNow(isoDate: string, now: string): number {
  const a = Date.parse(isoDate.slice(0, 10) + "T00:00:00Z");
  const b = Date.parse(now.slice(0, 10) + "T00:00:00Z");
  return Math.round((a - b) / 86400000);
}

function sourcesFromObligation(o: ObligationRow): SupportingSource[] {
  return [
    {
      filename: o.source_document ?? "Obligation register",
      citation: o.source_citation ?? undefined,
      excerpt: `${o.title} due ${o.next_due_at ?? "unscheduled"} (${o.review_state})`,
    },
  ];
}

export function planIdentifyDeadlines(ctx: ToolContext): PlannedProposal[] {
  const today = ctx.now.slice(0, 10);
  const upcoming = ctx.obligations.filter((o) => {
    if (ctx.facilityId && o.facility_id !== ctx.facilityId) return false;
    if (!o.next_due_at) return false;
    const delta = daysFromNow(o.next_due_at, ctx.now);
    return delta <= 45;
  });

  const plans: PlannedProposal[] = [];
  for (const o of upcoming) {
    if (plans.length >= MAX_PROPOSALS_PER_RUN) break;
    const overdue = o.next_due_at && o.next_due_at < today;
    const payload = forceDraftPayload({
      obligationId: o.id,
      title: o.title,
      nextDueAt: o.next_due_at,
      severity: overdue ? "overdue" : "upcoming",
      review_state: "draft",
    });
    const forbidden = assertPayloadNotConsequentialWrite(payload);
    if (!forbidden.ok) continue;
    const dedupeKey = `deadline_alert:${o.facility_id}:${o.id}`;
    if (ctx.pendingDedupeKeys.includes(dedupeKey)) continue;
    plans.push({
      kind: "deadline_alert",
      capability: "identify_deadlines",
      facilityId: o.facility_id,
      dedupeKey,
      payload,
      proposedChange: {
        before: null,
        after: { kind: "deadline_alert", title: o.title, nextDueAt: o.next_due_at },
      },
      supportingSources: sourcesFromObligation(o),
      toolName: "identify_deadlines",
    });
  }
  return plans;
}

export function planProposeTasks(ctx: ToolContext): PlannedProposal[] {
  const today = ctx.now.slice(0, 10);
  const plans: PlannedProposal[] = [];

  const overdueObligations = ctx.obligations.filter((o) => {
    if (ctx.facilityId && o.facility_id !== ctx.facilityId) return false;
    return Boolean(o.next_due_at && o.next_due_at < today);
  });

  for (const o of overdueObligations) {
    if (plans.length >= MAX_PROPOSALS_PER_RUN) break;
    const finding = `Follow up overdue obligation: ${o.title}`;
    const alreadyOpen = ctx.actions.some(
      (a) =>
        a.facility_id === o.facility_id &&
        a.status !== "closed" &&
        a.finding.toLowerCase().includes(o.title.toLowerCase())
    );
    if (alreadyOpen) continue;
    const dedupeKey = `corrective_action:${o.facility_id}:${finding.toLowerCase()}`;
    if (ctx.pendingDedupeKeys.includes(dedupeKey)) continue;
    const payload = forceDraftPayload({
      facilityId: o.facility_id,
      finding,
      description: `Agent-proposed follow-up for overdue obligation ${o.title} (${o.source_citation ?? "no citation"}).`,
      ownerName: o.owner_name,
      dueDate: today,
      priority: "high",
      evidenceRequired: o.evidence_required,
      sourceReferences: o.source_citation,
      status: "open",
      review_state: "draft",
    });
    const forbidden = assertPayloadNotConsequentialWrite(payload);
    if (!forbidden.ok) continue;
    plans.push({
      kind: "corrective_action",
      capability: "propose_tasks",
      facilityId: o.facility_id,
      dedupeKey,
      payload,
      proposedChange: { before: null, after: payload },
      supportingSources: sourcesFromObligation(o),
      toolName: "propose_tasks",
    });
  }

  for (const e of ctx.evidence) {
    if (plans.length >= MAX_PROPOSALS_PER_RUN) break;
    if (ctx.facilityId && e.facility_id !== ctx.facilityId) continue;
    if (e.status !== "missing") continue;
    const finding = `Collect missing evidence: ${e.title}`;
    const dedupeKey = `corrective_action:${e.facility_id}:${finding.toLowerCase()}`;
    if (ctx.pendingDedupeKeys.includes(dedupeKey)) continue;
    const payload = forceDraftPayload({
      facilityId: e.facility_id,
      finding,
      description: e.required_proof ?? "Upload required proof for this evidence item.",
      priority: "medium",
      status: "open",
      review_state: "draft",
    });
    plans.push({
      kind: "corrective_action",
      capability: "propose_tasks",
      facilityId: e.facility_id,
      dedupeKey,
      payload,
      proposedChange: { before: null, after: payload },
      supportingSources: [
        {
          filename: "Evidence tracker",
          excerpt: `${e.title} is missing (${e.required_proof ?? "proof required"})`,
        },
      ],
      toolName: "propose_tasks",
    });
  }

  return plans;
}

export function planPrepareRecords(ctx: ToolContext): PlannedProposal[] {
  const scopedObligations = ctx.obligations.filter(
    (o) => !ctx.facilityId || o.facility_id === ctx.facilityId
  );
  const scopedActions = ctx.actions.filter((a) => !ctx.facilityId || a.facility_id === ctx.facilityId);
  const scopedEvidence = ctx.evidence.filter((e) => !ctx.facilityId || e.facility_id === ctx.facilityId);
  const plans: PlannedProposal[] = [];

  const periodLabel = new Date(ctx.now).toLocaleString("en-US", { month: "long", year: "numeric" });
  const briefing = buildBriefingContent({
    periodLabel,
    organizationName: ctx.organizationName,
    facilityName: ctx.facilityName,
    obligations: scopedObligations,
    actions: scopedActions,
    evidence: scopedEvidence,
  });
  const briefingKey = `briefing:${ctx.facilityId ?? "org"}:${periodLabel}`;
  if (!ctx.pendingDedupeKeys.includes(briefingKey)) {
    const payload = forceDraftPayload({
      facilityId: ctx.facilityId,
      periodLabel,
      title: `${periodLabel} compliance briefing`,
      content: briefing,
      review_state: "draft",
    });
    plans.push({
      kind: "briefing",
      capability: "prepare_records",
      facilityId: ctx.facilityId,
      dedupeKey: briefingKey,
      payload,
      proposedChange: { before: null, after: { title: payload.title, review_state: "draft" } },
      supportingSources: [
        {
          filename: "Workspace register",
          excerpt: `Draft briefing from ${scopedObligations.length} obligation(s), ${scopedActions.length} action(s).`,
        },
      ],
      toolName: "prepare_records",
    });
  }

  if (ctx.facilityId && plans.length < MAX_PROPOSALS_PER_RUN) {
    const title = `Inspection prep — ${ctx.facilityName ?? "facility"}`;
    const prepKey = `inspection_prep:${ctx.facilityId}:${ctx.now.slice(0, 10)}`;
    if (!ctx.pendingDedupeKeys.includes(prepKey)) {
      const payload = forceDraftPayload({
        facilityId: ctx.facilityId,
        title,
        inspectionType: "facility",
        checklist: defaultInspectionChecklist(),
        summary: "Agent-prepared inspection checklist. Draft only until EHS review.",
        review_state: "draft",
      });
      plans.push({
        kind: "inspection_prep",
        capability: "prepare_records",
        facilityId: ctx.facilityId,
        dedupeKey: prepKey,
        payload,
        proposedChange: { before: null, after: { title, review_state: "draft" } },
        supportingSources: [
          {
            filename: "Inspection workflow",
            excerpt: "Standard facility walkdown checklist prepared as a draft.",
          },
        ],
        toolName: "prepare_records",
      });
    }
  }

  return plans.slice(0, MAX_PROPOSALS_PER_RUN);
}

const normalizeKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function obligationDedupeKey(facilityId: string, citation: string, requirement: string): string {
  return `obligation:${facilityId}:${normalizeKey(citation)}:${normalizeKey(requirement)}`;
}

function jurisdictionFromCitation(citation: string): string | null {
  if (/\bCFR\b|U\.S\.C\./i.test(citation)) return "Federal";
  if (/state|local|N\.J\.A\.C\.|permit/i.test(citation)) return "State / local";
  return null;
}

/** Propose register rows only for ARDR rows a human marked Yes or TBD for this facility. */
export function planImportArdr(ctx: ToolContext): PlannedProposal[] {
  const facilityId = ctx.facilityId;
  if (!facilityId || !ctx.ardrRows?.length) return [];

  const existing = new Set(
    ctx.obligations
      .filter((o) => o.facility_id === facilityId)
      .map((o) => obligationDedupeKey(facilityId, o.source_citation ?? "", o.title))
  );
  const filename = ctx.ardrFilename?.trim() || "ARDR worksheet";
  const plans: PlannedProposal[] = [];

  for (const row of ctx.ardrRows) {
    if (plans.length >= MAX_REGISTER_PROPOSALS_PER_RUN) break;
    if (row.applies !== "yes" && row.applies !== "tbd") continue;
    const dedupeKey = obligationDedupeKey(facilityId, row.citation, row.requirement);
    if (existing.has(dedupeKey) || ctx.pendingDedupeKeys.includes(dedupeKey)) continue;
    if (plans.some((p) => p.dedupeKey === dedupeKey)) continue;

    const isoDue = /^\d{4}-\d{2}-\d{2}/.test(row.nextActionDue) ? row.nextActionDue.slice(0, 10) : null;
    const notes = [
      `Imported from ARDR (${row.sheet} · ${row.programTopic || "General"}); Applies? ${row.applies === "yes" ? "Yes" : "TBD"}.`,
      !isoDue && row.nextActionDue ? `Next action: ${row.nextActionDue}.` : "",
      row.notes,
    ]
      .filter(Boolean)
      .join(" ");
    const supportingSources: SupportingSource[] = [
      {
        filename,
        citation: row.citation || undefined,
        excerpt: `${row.sheet} row ${row.rowNumber}: ${row.requirement}`,
      },
    ];
    const payload = forceDraftPayload({
      facilityId,
      title: row.requirement,
      sourceDocument: row.referenceDocuments || filename,
      sourceCitation: row.citation,
      jurisdiction: jurisdictionFromCitation(row.citation),
      frequency: row.frequency || null,
      ownerName: row.owner || null,
      evidenceRequired: row.implementation || null,
      nextDueAt: isoDue,
      applies: row.applies,
      notes,
      status: "draft",
      review_state: "draft",
    });
    if (!assertPayloadNotConsequentialWrite(payload).ok) continue;
    if (!assertProposalGrounded("obligation", payload, supportingSources).ok) continue;

    plans.push({
      kind: "obligation",
      capability: "populate_register",
      facilityId,
      dedupeKey,
      payload,
      proposedChange: {
        before: null,
        after: { title: row.requirement, citation: row.citation, applies: row.applies, review_state: "draft" },
      },
      supportingSources,
      toolName: "import_ardr",
    });
  }
  return plans;
}

export function planTool(tool: ToolName, ctx: ToolContext): PlannedProposal[] {
  if (tool === "identify_deadlines") return planIdentifyDeadlines(ctx);
  if (tool === "propose_tasks") return planProposeTasks(ctx);
  if (tool === "prepare_records") return planPrepareRecords(ctx);
  if (tool === "import_ardr") return planImportArdr(ctx);
  return [];
}
