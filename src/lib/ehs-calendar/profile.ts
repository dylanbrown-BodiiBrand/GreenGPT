import {
  VALID_FLAG_IDS,
  VALID_INDUSTRY_IDS,
  VALID_JURISDICTION_IDS,
} from "./rulesEngine";

const FLAG_SET = new Set<string>(VALID_FLAG_IDS);
const JURISDICTION_SET = new Set<string>(VALID_JURISDICTION_IDS);
const INDUSTRY_SET = new Set<string>(VALID_INDUSTRY_IDS);

export type EhsProfile = {
  industry: string;
  jurisdictions: string[];
  flags: string[];
  employees: number;
};

export function parseEhsProfile(body: unknown): { profile?: EhsProfile; error?: string } {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const industry = typeof payload.industry === "string" ? payload.industry : "";
  const jurisdictions = Array.isArray(payload.jurisdictions) ? payload.jurisdictions : [];
  const flags = Array.isArray(payload.flags) ? payload.flags : [];
  const employeesRaw = payload.employees;

  if (!INDUSTRY_SET.has(industry)) return { error: "Invalid industry." };
  if (!jurisdictions.every((j) => typeof j === "string" && JURISDICTION_SET.has(j))) {
    return { error: "Invalid jurisdictions." };
  }
  if (!flags.every((f) => typeof f === "string" && FLAG_SET.has(f))) {
    return { error: "Invalid facility flags." };
  }

  let employees = 50;
  if (typeof employeesRaw === "number" && Number.isFinite(employeesRaw)) {
    employees = Math.min(500, Math.max(1, Math.floor(employeesRaw)));
  }

  return {
    profile: {
      industry,
      jurisdictions: jurisdictions as string[],
      flags: flags as string[],
      employees,
    },
  };
}

export function isValidEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
