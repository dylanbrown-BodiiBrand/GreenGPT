import { describe, expect, it } from "vitest";
import {
  ardrFilename,
  inferProgramTopic,
  mapObligationToArdrStatus,
  obligationToArdrRow,
} from "../ardrExport";
import type { ObligationRow } from "../types";

const baseObligation = (over: Partial<ObligationRow> = {}): ObligationRow => ({
  id: "o1",
  organization_id: "org",
  facility_id: "fac",
  title: "Tier II / EPCRA reporting",
  source_document: "EPCRA binder",
  source_citation: "40 CFR 370",
  jurisdiction: "Federal / NJ",
  frequency: "Annual",
  owner_name: "EHS Manager",
  evidence_required: "Submitted confirmation",
  status: "open",
  review_state: "draft",
  next_due_at: "2026-03-01",
  notes: null,
  ...over,
});

describe("ardrExport mapping", () => {
  it("maps workspace statuses into ARDR legend", () => {
    expect(mapObligationToArdrStatus("draft", "draft")).toBe("Not Started");
    expect(mapObligationToArdrStatus("open", "draft")).toBe("In Progress");
    expect(mapObligationToArdrStatus("completed", "approved")).toBe("Complete");
    expect(mapObligationToArdrStatus("overdue", "draft")).toBe("Needs Review");
    expect(mapObligationToArdrStatus("open", "needs_clarification")).toBe("Needs Review");
    expect(mapObligationToArdrStatus("archived", "archived")).toBe("N/A");
  });

  it("infers program topics from citations", () => {
    expect(inferProgramTopic(baseObligation())).toBe("EPCRA-SARA");
    expect(
      inferProgramTopic(
        baseObligation({ title: "SPCC Plan", source_citation: "40 CFR 112.5", jurisdiction: "Federal" })
      )
    ).toBe("SPCC & Spill");
    expect(
      inferProgramTopic(
        baseObligation({ title: "HazCom program", source_citation: "29 CFR 1910.1200", jurisdiction: null })
      )
    ).toBe("Safety (OSHA)");
  });

  it("builds ARDR matrix rows from obligations", () => {
    const row = obligationToArdrRow(baseObligation({ review_state: "approved", status: "completed" }), []);
    expect(row.requirement).toBe("Tier II / EPCRA reporting");
    expect(row.citation).toBe("40 CFR 370");
    expect(row.applies).toBe("Yes");
    expect(row.status).toBe("Complete");
    expect(row.facilityImplementation).toContain("Submitted confirmation");
  });

  it("builds safe filenames", () => {
    expect(ardrFilename("Newark Plant", new Date("2026-08-16T12:00:00Z"))).toBe(
      "GreenGPT-ARDR-Newark-Plant-2026-08-16.xlsx"
    );
  });
});
