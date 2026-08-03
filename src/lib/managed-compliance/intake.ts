export type IntakeFormData = {
  company: string;
  contact: string;
  email: string;
  phone: string;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  industry: string;
  naics: string;
  employees: string;
  facility_count: string;
  shifts: string;
  permits: string[];
  hazards: string[];
  chemicals: string;
  waste_streams: string;
  equipment: string;
  current_system: string;
  pain_points: string;
  audit_history: string;
  goals: string;
  desired_workflow: string;
  timeline: string;
  redacted_docs: string;
  preferred_next_step: string;
};

export const EMPTY_INTAKE: IntakeFormData = {
  company: "",
  contact: "",
  email: "",
  phone: "",
  title: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  industry: "",
  naics: "",
  employees: "",
  facility_count: "",
  shifts: "",
  permits: [],
  hazards: [],
  chemicals: "",
  waste_streams: "",
  equipment: "",
  current_system: "",
  pain_points: "",
  audit_history: "",
  goals: "",
  desired_workflow: "",
  timeline: "",
  redacted_docs: "",
  preferred_next_step: "",
};

export function isValidIntakeEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const email = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseIntakeBody(body: unknown): { data?: IntakeFormData; error?: string } {
  const p = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  const str = (key: keyof IntakeFormData, max = 4000) => {
    const v = p[key];
    if (typeof v !== "string") return "";
    return v.trim().slice(0, max);
  };

  const list = (key: "permits" | "hazards") => {
    const v = p[key];
    if (!Array.isArray(v)) return [] as string[];
    return v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 80));
  };

  const data: IntakeFormData = {
    company: str("company", 200),
    contact: str("contact", 120),
    email: str("email", 200).toLowerCase(),
    phone: str("phone", 40),
    title: str("title", 120),
    address: str("address", 300),
    city: str("city", 120),
    state: str("state", 80),
    zip: str("zip", 20),
    industry: str("industry", 80),
    naics: str("naics", 40),
    employees: str("employees", 40),
    facility_count: str("facility_count", 40),
    shifts: str("shifts", 80),
    permits: list("permits"),
    hazards: list("hazards"),
    chemicals: str("chemicals"),
    waste_streams: str("waste_streams"),
    equipment: str("equipment"),
    current_system: str("current_system"),
    pain_points: str("pain_points"),
    audit_history: str("audit_history"),
    goals: str("goals"),
    desired_workflow: str("desired_workflow", 120),
    timeline: str("timeline", 120),
    redacted_docs: str("redacted_docs", 40),
    preferred_next_step: str("preferred_next_step", 120),
  };

  if (!data.company) return { error: "Company name is required." };
  if (!data.contact) return { error: "Contact name is required." };
  if (!isValidIntakeEmail(data.email)) return { error: "Valid email is required." };
  if (!data.state) return { error: "State is required." };
  if (!data.industry) return { error: "Industry is required." };

  return { data };
}
