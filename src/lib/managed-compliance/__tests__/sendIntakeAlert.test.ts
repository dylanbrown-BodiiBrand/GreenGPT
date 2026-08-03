import { describe, expect, it } from "vitest";
import { formatIntakeAlertText } from "../sendIntakeAlert";
import type { IntakeFormData } from "../intake";

const sample: IntakeFormData = {
  company: "Acme Chemical",
  contact: "Jane Doe",
  email: "jane@acme.com",
  phone: "555-0100",
  title: "EHS Manager",
  address: "100 Plant Rd",
  city: "Newark",
  state: "New Jersey",
  zip: "07102",
  industry: "chemical_mfg",
  naics: "325199",
  employees: "150-500",
  facility_count: "2-5",
  shifts: "2",
  permits: ["title_v", "tier2"],
  hazards: ["confined"],
  chemicals: "toluene",
  waste_streams: "",
  equipment: "",
  current_system: "Excel",
  pain_points: "Missed Tier II",
  audit_history: "",
  goals: "Audit-ready",
  desired_workflow: "corrective_actions",
  timeline: "30_days",
  redacted_docs: "yes",
  preferred_next_step: "diagnostic_call",
};

describe("formatIntakeAlertText", () => {
  it("includes key facility fields and admin link", () => {
    const text = formatIntakeAlertText(sample, "https://example.com/admin/intakes");
    expect(text).toContain("Diagnostic request");
    expect(text).toContain("Acme Chemical");
    expect(text).toContain("jane@acme.com");
    expect(text).toContain("Chemical Manufacturing");
    expect(text).toContain("title_v");
    expect(text).toContain("Missed Tier II");
    expect(text).toContain("https://example.com/admin/intakes");
  });
});
