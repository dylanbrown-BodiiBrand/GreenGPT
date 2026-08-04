import {
  isCorrectiveActionStatus,
  isReviewState,
  type CorrectiveActionStatus,
  type EvidenceStatus,
  type ReviewState,
} from "./types";

export type CreateActionInput = {
  facilityId: string;
  finding: string;
  description: string;
  ownerName: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "critical";
  evidenceRequired: string;
  sourceReferences: string;
  notes: string;
};

export type UpdateActionInput = {
  id: string;
  status?: CorrectiveActionStatus;
  ownerName?: string;
  dueDate?: string;
  evidenceLink?: string;
  notes?: string;
  reviewerName?: string;
};

export type UpdateEvidenceInput = {
  id: string;
  status: EvidenceStatus;
  notes?: string;
  filePath?: string;
};

export type CreateInspectionInput = {
  facilityId: string;
  title: string;
  inspectionType: "facility" | "regulatory" | "internal";
  scheduledFor: string;
  summary: string;
  checklist: { id: string; label: string; done: boolean; notes?: string }[];
};

const PRIORITIES = new Set(["low", "medium", "high", "critical"]);
const EVIDENCE_STATUSES = new Set(["missing", "uploaded", "reviewed", "audit_ready"]);
const INSPECTION_TYPES = new Set(["facility", "regulatory", "internal"]);

function str(v: unknown, max = 2000): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export function parseCreateAction(body: unknown): { data?: CreateActionInput; error?: string } {
  const p = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const facilityId = str(p.facilityId, 80);
  const finding = str(p.finding, 500);
  const priority = str(p.priority, 20) || "medium";
  if (!facilityId) return { error: "facilityId is required." };
  if (!finding) return { error: "Finding is required." };
  if (!PRIORITIES.has(priority)) return { error: "Invalid priority." };
  return {
    data: {
      facilityId,
      finding,
      description: str(p.description),
      ownerName: str(p.ownerName, 120),
      dueDate: str(p.dueDate, 40),
      priority: priority as CreateActionInput["priority"],
      evidenceRequired: str(p.evidenceRequired, 500),
      sourceReferences: str(p.sourceReferences, 500),
      notes: str(p.notes),
    },
  };
}

export function parseUpdateAction(body: unknown): { data?: UpdateActionInput; error?: string } {
  const p = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = str(p.id, 80);
  if (!id) return { error: "id is required." };
  const statusRaw = str(p.status, 40);
  if (statusRaw && !isCorrectiveActionStatus(statusRaw)) return { error: "Invalid status." };
  return {
    data: {
      id,
      status: statusRaw ? (statusRaw as CorrectiveActionStatus) : undefined,
      ownerName: p.ownerName !== undefined ? str(p.ownerName, 120) : undefined,
      dueDate: p.dueDate !== undefined ? str(p.dueDate, 40) : undefined,
      evidenceLink: p.evidenceLink !== undefined ? str(p.evidenceLink, 500) : undefined,
      notes: p.notes !== undefined ? str(p.notes) : undefined,
      reviewerName: p.reviewerName !== undefined ? str(p.reviewerName, 120) : undefined,
    },
  };
}

export function parseUpdateEvidence(body: unknown): { data?: UpdateEvidenceInput; error?: string } {
  const p = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = str(p.id, 80);
  const status = str(p.status, 40);
  if (!id) return { error: "id is required." };
  if (!EVIDENCE_STATUSES.has(status)) return { error: "Invalid evidence status." };
  return {
    data: {
      id,
      status: status as EvidenceStatus,
      notes: p.notes !== undefined ? str(p.notes) : undefined,
      filePath: p.filePath !== undefined ? str(p.filePath, 500) : undefined,
    },
  };
}

export function parseCreateInspection(body: unknown): { data?: CreateInspectionInput; error?: string } {
  const p = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const facilityId = str(p.facilityId, 80);
  const title = str(p.title, 200);
  const inspectionType = str(p.inspectionType, 40) || "facility";
  if (!facilityId) return { error: "facilityId is required." };
  if (!title) return { error: "Title is required." };
  if (!INSPECTION_TYPES.has(inspectionType)) return { error: "Invalid inspection type." };

  const checklistRaw = Array.isArray(p.checklist) ? p.checklist : [];
  const checklist = checklistRaw
    .map((item, i) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const label = str(row.label, 300);
      if (!label) return null;
      return {
        id: str(row.id, 80) || `item-${i + 1}`,
        label,
        done: Boolean(row.done),
        notes: str(row.notes, 500) || undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  if (!checklist.length) return { error: "At least one checklist item is required." };

  return {
    data: {
      facilityId,
      title,
      inspectionType: inspectionType as CreateInspectionInput["inspectionType"],
      scheduledFor: str(p.scheduledFor, 40),
      summary: str(p.summary),
      checklist,
    },
  };
}

export function parseReviewStateUpdate(body: unknown): {
  data?: { id: string; reviewState: ReviewState; reviewerName?: string };
  error?: string;
} {
  const p = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = str(p.id, 80);
  const reviewState = str(p.reviewState, 40);
  if (!id) return { error: "id is required." };
  if (!isReviewState(reviewState)) return { error: "Invalid review state." };
  return {
    data: {
      id,
      reviewState,
      reviewerName: p.reviewerName !== undefined ? str(p.reviewerName, 120) : undefined,
    },
  };
}
