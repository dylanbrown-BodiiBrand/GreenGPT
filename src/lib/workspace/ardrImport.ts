import ExcelJS from "exceljs";

export type ArdrApplies = "yes" | "tbd" | "no" | "blank";

/** One requirement row from a human-completed ARDR worksheet (template tabs or export register). */
export type ArdrImportRow = {
  sheet: string;
  rowNumber: number;
  programTopic: string;
  requirement: string;
  citation: string;
  applies: ArdrApplies;
  referenceDocuments: string;
  implementation: string;
  owner: string;
  frequency: string;
  nextActionDue: string;
  notes: string;
};

const HEADER_MARKER = "program / topic";
const MAX_ROWS = 2000;

export function normalizeApplies(raw: string): ArdrApplies {
  const v = raw.trim().toLowerCase();
  if (!v) return "blank";
  if (v === "y" || v === "yes") return "yes";
  if (v === "n" || v === "no" || v === "n/a" || v === "na") return "no";
  return "tbd";
}

function findHeaderRow(sheet: ExcelJS.Worksheet): number | null {
  for (let r = 1; r <= Math.min(10, sheet.rowCount); r++) {
    if (sheet.getCell(r, 1).text.trim().toLowerCase() === HEADER_MARKER) return r;
  }
  return null;
}

export async function parseArdrWorkbook(buffer: Buffer | ArrayBuffer): Promise<ArdrImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);

  const rows: ArdrImportRow[] = [];
  for (const sheet of wb.worksheets) {
    const header = findHeaderRow(sheet);
    if (!header) continue;
    let topic = "";
    for (let r = header + 1; r <= sheet.rowCount && rows.length < MAX_ROWS; r++) {
      const text = (col: number) => sheet.getCell(r, col).text.trim();
      if (text(1)) topic = text(1);
      const requirement = text(2);
      const notes = text(11);
      if (!requirement || notes.toUpperCase().startsWith("EXAMPLE ROW")) continue;
      rows.push({
        sheet: sheet.name,
        rowNumber: r,
        programTopic: topic,
        requirement,
        citation: text(3),
        applies: normalizeApplies(text(4)),
        referenceDocuments: text(5),
        implementation: text(6),
        owner: text(7),
        frequency: text(9),
        nextActionDue: text(10),
        notes,
      });
    }
  }
  return rows;
}
