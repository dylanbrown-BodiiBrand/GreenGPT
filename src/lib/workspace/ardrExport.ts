import ExcelJS from "exceljs";
import type {
  CorrectiveActionRow,
  EvidenceItemRow,
  FacilityRow,
  ObligationRow,
} from "./types";

/** ARDR matrix status legend (export snapshot — not the live workspace enum). */
export const ARDR_STATUS_LEGEND = [
  "Not Started",
  "In Progress",
  "Complete",
  "Needs Review",
  "N/A",
] as const;

export type ArdrStatus = (typeof ARDR_STATUS_LEGEND)[number];

export type ArdrMatrixRow = {
  programTopic: string;
  requirement: string;
  citation: string;
  applies: string;
  referenceDocuments: string;
  facilityImplementation: string;
  owner: string;
  status: ArdrStatus;
  frequency: string;
  nextActionDue: string;
  notes: string;
};

export type ArdrExportInput = {
  organizationName: string;
  facility: FacilityRow;
  preparedBy?: string | null;
  exportedAt?: Date;
  obligations: ObligationRow[];
  actions: CorrectiveActionRow[];
  evidence: EvidenceItemRow[];
  /** When true, Cover notes this is pilot-preview sample data. */
  preview?: boolean;
};

const MATRIX_HEADERS = [
  "Program / Topic",
  "Requirement",
  "Citation",
  "Applies? (Y/N/TBD)",
  "Reference Documents",
  "Facility Implementation / Evidence (incl. record retention)",
  "Owner",
  "Status",
  "Frequency",
  "Next Action / Due Date",
  "Notes",
] as const;

/**
 * Map live workspace obligation status + review_state into the ARDR spreadsheet legend.
 * Workspace remains system of record; this is a display mapping for the export only.
 */
export function mapObligationToArdrStatus(
  status: string,
  reviewState: string
): ArdrStatus {
  if (status === "archived" || reviewState === "archived") return "N/A";
  if (reviewState === "needs_clarification" || status === "needs_clarification") {
    return "Needs Review";
  }
  if (status === "completed" || reviewState === "approved") return "Complete";
  if (status === "overdue") return "Needs Review";
  if (reviewState === "reviewed") return "Needs Review";
  if (status === "draft" && reviewState === "draft") return "Not Started";
  return "In Progress";
}

export function inferProgramTopic(obligation: ObligationRow): string {
  const hay = `${obligation.jurisdiction ?? ""} ${obligation.source_citation ?? ""} ${obligation.title}`.toLowerCase();
  if (/osha|1910|hazcom|ppe|lockout|confined/.test(hay)) return "Safety (OSHA)";
  if (/air|title v|neshap|nsps|opacity|ghg|part 70|part 60|part 63|part 98/.test(hay)) return "Air";
  if (/water|npdes|stormwater|swppp|potw|sdwa|part 122/.test(hay)) return "Water";
  if (/rcra|hazardous waste|manifest|generator|part 262/.test(hay)) return "Waste";
  if (/spcc|spill|oil|part 112/.test(hay)) return "SPCC & Spill";
  if (/tsca|part 7\d\d/.test(hay)) return "TSCA";
  if (/epcra|sara|tier ii|tri|cercla|part 370|part 372/.test(hay)) return "EPCRA-SARA";
  if (/dot|49 cfr|hazmat|shipping/.test(hay)) return "DOT";
  if (/isra|property|site remediation|brownfield/.test(hay)) return "Site";
  return obligation.jurisdiction?.trim() || "General";
}

export function obligationToArdrRow(
  obligation: ObligationRow,
  evidenceForFacility: EvidenceItemRow[]
): ArdrMatrixRow {
  const linkedEvidence = evidenceForFacility
    .filter((e) => e.title.toLowerCase().includes(obligation.title.slice(0, 24).toLowerCase()))
    .slice(0, 3);
  const evidenceSummary =
    [
      obligation.evidence_required,
      ...linkedEvidence.map((e) => `${e.title} (${e.status})`),
    ]
      .filter(Boolean)
      .join("; ") || "";

  const notes = [
    obligation.notes,
    `Workspace review: ${obligation.review_state}`,
    `Workspace status: ${obligation.status}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    programTopic: inferProgramTopic(obligation),
    requirement: obligation.title,
    citation: obligation.source_citation ?? "",
    applies: "Yes",
    referenceDocuments: obligation.source_document ?? "",
    facilityImplementation: evidenceSummary,
    owner: obligation.owner_name ?? "",
    status: mapObligationToArdrStatus(obligation.status, obligation.review_state),
    frequency: obligation.frequency ?? "",
    nextActionDue: obligation.next_due_at ?? "",
    notes,
  };
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FF0B3D2E" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F7F4" },
  };
}

function autosize(sheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

/**
 * Build an ARDR-shaped workbook snapshot from workspace records.
 * Live status, evidence, and CAPs continue to live in the Managed Workspace.
 */
export async function buildArdrWorkbook(input: ArdrExportInput): Promise<ExcelJS.Workbook> {
  const exportedAt = input.exportedAt ?? new Date();
  const iso = exportedAt.toISOString().slice(0, 10);
  const wb = new ExcelJS.Workbook();
  wb.creator = "GreenGPT Advisory";
  wb.created = exportedAt;

  const cover = wb.addWorksheet("Cover");
  cover.getCell("B2").value = "GreenGPT Advisory";
  cover.getCell("B2").font = { bold: true, size: 16, color: { argb: "FF0B3D2E" } };
  cover.getCell("B3").value =
    "Applicable Regulations & Document Review (ARDR) — Facility Compliance Matrix (export)";
  cover.getCell("B3").font = { bold: true, size: 12 };
  cover.getCell("B4").value =
    "Roles: (1) Paid diagnostic — ARDR is the working applicability worksheet. (2) Managed — workspace is system of record for status, evidence, and CAPs. (3) This file — export / handoff snapshot only.";
  cover.getCell("B4").font = { italic: true, color: { argb: "FF6B7280" } };

  const coverFields: [string, string][] = [
    ["Owner / Company", input.organizationName],
    ["Facility Name", input.facility.name],
    ["Facility Address / State", [input.facility.state, input.facility.industry].filter(Boolean).join(" · ") || ""],
    ["Prepared by", input.preparedBy?.trim() || "GreenGPT Advisory workspace export"],
    ["Date Prepared / Exported", iso],
    ["Reviewed by (Client)", ""],
    ["Date Reviewed", ""],
  ];
  coverFields.forEach(([label, value], i) => {
    const row = 6 + i;
    cover.getCell(`B${row}`).value = label;
    cover.getCell(`B${row}`).font = { bold: true };
    cover.getCell(`C${row}`).value = value;
  });

  cover.getCell("B14").value = "How this export relates to intake, diagnostic, and workspace";
  cover.getCell("B14").font = { bold: true };
  cover.getCell("B15").value =
    "1. Commercial intake is the web form at /intake — a completed ARDR is not required to request a diagnostic.";
  cover.getCell("B16").value =
    "2. During the paid diagnostic, complete Applies?, evidence, and owners in the ARDR worksheet; that matrix seeds the workspace register.";
  cover.getCell("B17").value =
    "3. After load, update status, evidence, and CAPs in the Managed Workspace — then re-export ARDR for client packs or walkdowns.";
  cover.getCell("B18").value =
    "4. This matrix is a working draft until reviewed and approved. It supports — and does not replace — the Client’s EHS accountability. Not legal advice.";
  if (input.preview) {
    cover.getCell("B19").value =
      "PREVIEW: Sample/pilot data only — not a live client facility record.";
    cover.getCell("B19").font = { bold: true, color: { argb: "FFB45309" } };
  }
  autosize(cover, [4, 36, 72]);

  const matrix = wb.addWorksheet("Obligation Register");
  matrix.getCell("A1").value = "GreenGPT Advisory — ARDR Compliance Matrix (workspace export)";
  matrix.getCell("A1").font = { bold: true };
  matrix.getCell("A2").value = `Facility: ${input.facility.name}  |  Exported: ${iso}  |  Status legend: ${ARDR_STATUS_LEGEND.join(" / ")}`;
  MATRIX_HEADERS.forEach((h, i) => {
    matrix.getCell(4, i + 1).value = h;
  });
  styleHeaderRow(matrix.getRow(4));

  const matrixRows = input.obligations.map((o) =>
    obligationToArdrRow(
      o,
      input.evidence.filter((e) => e.facility_id === o.facility_id)
    )
  );
  matrixRows.forEach((r, idx) => {
    const row = matrix.getRow(5 + idx);
    row.values = [
      undefined,
      r.programTopic,
      r.requirement,
      r.citation,
      r.applies,
      r.referenceDocuments,
      r.facilityImplementation,
      r.owner,
      r.status,
      r.frequency,
      r.nextActionDue,
      r.notes,
    ];
  });
  autosize(matrix, [22, 42, 28, 12, 28, 36, 16, 14, 14, 18, 36]);

  const caps = wb.addWorksheet("CAPs (workspace)");
  caps.getCell("A1").value = "Corrective actions — live in workspace; this sheet is a snapshot";
  caps.getCell("A1").font = { bold: true };
  const capHeaders = [
    "Finding",
    "Description",
    "Owner",
    "Due date",
    "Priority",
    "Status",
    "Evidence required",
    "Evidence link",
    "Notes",
  ];
  capHeaders.forEach((h, i) => {
    caps.getCell(3, i + 1).value = h;
  });
  styleHeaderRow(caps.getRow(3));
  input.actions.forEach((a, idx) => {
    const row = caps.getRow(4 + idx);
    row.values = [
      undefined,
      a.finding,
      a.description ?? "",
      a.owner_name ?? "",
      a.due_date ?? "",
      a.priority,
      a.status,
      a.evidence_required ?? "",
      a.evidence_link ?? "",
      a.notes ?? "",
    ];
  });
  autosize(caps, [32, 36, 16, 12, 10, 16, 28, 24, 28]);

  const evidence = wb.addWorksheet("Evidence (workspace)");
  evidence.getCell("A1").value = "Evidence items — live in workspace; this sheet is a snapshot";
  evidence.getCell("A1").font = { bold: true };
  const evHeaders = ["Title", "Required proof", "Status", "Last reviewed", "Notes"];
  evHeaders.forEach((h, i) => {
    evidence.getCell(3, i + 1).value = h;
  });
  styleHeaderRow(evidence.getRow(3));
  input.evidence.forEach((e, idx) => {
    const row = evidence.getRow(4 + idx);
    row.values = [
      undefined,
      e.title,
      e.required_proof ?? "",
      e.status,
      e.last_reviewed_at ?? "",
      e.notes ?? "",
    ];
  });
  autosize(evidence, [36, 32, 14, 14, 36]);

  return wb;
}

export async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}

export function ardrFilename(facilityName: string, exportedAt = new Date()): string {
  const safe = facilityName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 48) || "facility";
  const iso = exportedAt.toISOString().slice(0, 10);
  return `GreenGPT-ARDR-${safe}-${iso}.xlsx`;
}
