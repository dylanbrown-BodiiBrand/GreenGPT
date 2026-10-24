import { describe, expect, it } from "vitest";
import { formatAskContext, previewAskContext } from "../askContext";

describe("Ask facility context", () => {
  it("includes profile, register status, corrective actions, and missing evidence", () => {
    const text = formatAskContext(previewAskContext(), "2026-10-24");
    expect(text).toContain("Pilot preview sample data");
    expect(text).toContain("Newark Plant · New Jersey · Chemical Manufacturing");
    expect(text).toContain("[OVERDUE] Tier II / EPCRA reporting — 40 CFR 370");
    expect(text).toContain("SPCC Plan 5-year review check — 40 CFR 112.5 — due 2026-09-15");
    expect(text).toContain("Secondary containment crack near drum storage — awaiting_evidence");
    expect(text).toContain("Hazard communication refresher attendance — required: Signed roster PDF");
  });

  it("adds intake site details when the facility is linked to its diagnostic intake", () => {
    const text = formatAskContext(
      {
        ...previewAskContext(),
        intake: {
          permits: ["Title V air", "NJPDES stormwater"],
          hazards: ["Flammables"],
          chemicals: "Toluene 2,000 gal AST",
          waste_streams: "",
        },
      },
      "2026-10-24"
    );
    expect(text).toContain("Site details from the diagnostic intake:");
    expect(text).toContain("- Permits: Title V air, NJPDES stormwater");
    expect(text).toContain("- Chemicals: Toluene 2,000 gal AST");
    expect(text).not.toContain("Waste streams");
  });
});
