import { describe, expect, it } from "vitest";
import {
  parseCreateAction,
  parseCreateInspection,
  parseReviewStateUpdate,
  parseUpdateEvidence,
} from "../parsers";
import { buildBriefingContent, defaultInspectionChecklist } from "../briefingBuilder";
import { canEditWorkspace } from "../roles";

describe("workspace parsers", () => {
  it("parses corrective action create", () => {
    const result = parseCreateAction({
      facilityId: "fac-1",
      finding: "Spill kit incomplete",
      priority: "high",
    });
    expect(result.data?.finding).toBe("Spill kit incomplete");
    expect(result.data?.priority).toBe("high");
  });

  it("rejects invalid evidence status", () => {
    const result = parseUpdateEvidence({ id: "e1", status: "done" });
    expect(result.error).toMatch(/invalid evidence status/i);
  });

  it("requires checklist for inspection create", () => {
    const bad = parseCreateInspection({ facilityId: "f1", title: "Prep", checklist: [] });
    expect(bad.error).toMatch(/checklist/i);
    const good = parseCreateInspection({
      facilityId: "f1",
      title: "Prep",
      checklist: defaultInspectionChecklist(),
    });
    expect(good.data?.checklist.length).toBeGreaterThan(0);
  });

  it("parses review state updates", () => {
    expect(parseReviewStateUpdate({ id: "x", reviewState: "approved" }).data?.reviewState).toBe(
      "approved"
    );
    expect(parseReviewStateUpdate({ id: "x", reviewState: "final" }).error).toMatch(/invalid/i);
  });
});

describe("roles and briefing builder", () => {
  it("allows editor roles only", () => {
    expect(canEditWorkspace("editor")).toBe(true);
    expect(canEditWorkspace("viewer")).toBe(false);
  });

  it("builds management attention from open work", () => {
    const content = buildBriefingContent({
      periodLabel: "August 2026",
      organizationName: "Acme",
      facilityName: "Plant 1",
      obligations: [],
      actions: [
        {
          id: "1",
          organization_id: "o",
          facility_id: "f",
          finding: "Late CAP",
          description: null,
          owner_name: null,
          due_date: "2020-01-01",
          priority: "high",
          evidence_required: null,
          evidence_link: null,
          status: "open",
          reviewer_name: null,
          notes: null,
        },
      ],
      evidence: [
        {
          id: "e",
          organization_id: "o",
          facility_id: "f",
          title: "Roster",
          required_proof: "PDF",
          status: "missing",
          last_reviewed_at: null,
          notes: null,
        },
      ],
    });
    expect(content.managementAttention.join(" ")).toMatch(/overdue/i);
    expect(content.disclaimer).toMatch(/draft/i);
  });
});
