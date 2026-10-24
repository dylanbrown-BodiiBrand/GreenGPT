import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { normalizeApplies, parseArdrWorkbook } from "../ardrImport";

const HEADERS = [
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
];

async function templateBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Cover").getCell("B2").value = "GreenGPT Advisory";
  const sheet = wb.addWorksheet("Safety (OSHA)");
  sheet.getCell("A1").value = "GreenGPT Advisory — ARDR Compliance Matrix";
  sheet.getRow(4).values = HEADERS;
  sheet.getRow(5).values = [
    "Hazard Communication (GHS)",
    "Written hazard communication program",
    "29 CFR 1910.1200(e)(1)",
    "Yes",
    "", "", "", "", "", "",
    "EXAMPLE ROW — replace with facility-specific entries",
  ];
  sheet.getRow(6).values = ["", "Safety Data Sheets accessible", "29 CFR 1910.1200(g)", "Y", "SDS binder"];
  sheet.getRow(7).values = ["", "GHS-compliant container labeling", "29 CFR 1910.1200(f)", "No"];
  sheet.getRow(8).values = ["Personal Protective Equipment", "PPE hazard assessment", "29 CFR 1910.132", "TBD"];
  sheet.getRow(9).values = ["", "Eye and face protection", "29 CFR 1910.133"];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("ARDR import parser", () => {
  it("normalizes Applies? values", () => {
    expect(normalizeApplies("Yes")).toBe("yes");
    expect(normalizeApplies("y")).toBe("yes");
    expect(normalizeApplies("No")).toBe("no");
    expect(normalizeApplies("N/A")).toBe("no");
    expect(normalizeApplies("TBD")).toBe("tbd");
    expect(normalizeApplies("")).toBe("blank");
  });

  it("reads requirement rows, skips the example row and Cover, and carries the topic forward", async () => {
    const rows = await parseArdrWorkbook(await templateBuffer());
    expect(rows.map((r) => r.requirement)).toEqual([
      "Safety Data Sheets accessible",
      "GHS-compliant container labeling",
      "PPE hazard assessment",
      "Eye and face protection",
    ]);
    expect(rows[0]).toMatchObject({
      sheet: "Safety (OSHA)",
      rowNumber: 6,
      programTopic: "Hazard Communication (GHS)",
      citation: "29 CFR 1910.1200(g)",
      applies: "yes",
      referenceDocuments: "SDS binder",
    });
    expect(rows.map((r) => r.applies)).toEqual(["yes", "no", "tbd", "blank"]);
    expect(rows[3].programTopic).toBe("Personal Protective Equipment");
  });
});
