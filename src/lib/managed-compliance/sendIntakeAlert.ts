import { Resend } from "resend";
import { getIntakeNotifyEmails } from "@/lib/admin/allowlist";
import type { IntakeFormData } from "@/lib/managed-compliance/intake";

const INDUSTRY_LABELS: Record<string, string> = {
  chemical_mfg: "Chemical Manufacturing",
  plastics_mfg: "Plastics & Rubber Manufacturing",
  food_bev: "Food & Beverage Processing",
  pharma: "Pharmaceutical Manufacturing",
  metals_mfg: "Metals & Metal Products",
  oil_gas: "Oil & Gas / Energy",
  construction: "Construction",
  warehousing: "Warehousing & Distribution",
  healthcare: "Healthcare",
  other: "Other",
};

export function formatIntakeAlertText(data: IntakeFormData, adminUrl?: string): string {
  const industry = INDUSTRY_LABELS[data.industry] ?? data.industry;
  const lines = [
    "New Facility Compliance Diagnostic request",
    "",
    `Company: ${data.company}`,
    `Contact: ${data.contact}${data.title ? ` (${data.title})` : ""}`,
    `Email: ${data.email}`,
    data.phone ? `Phone: ${data.phone}` : null,
    `State: ${data.state}`,
    `Industry: ${industry}`,
    data.facility_count ? `Facilities: ${data.facility_count}` : null,
    data.employees ? `Employees: ${data.employees}` : null,
    data.desired_workflow ? `Desired workflow: ${data.desired_workflow}` : null,
    data.timeline ? `Timeline: ${data.timeline}` : null,
    data.preferred_next_step ? `Preferred next step: ${data.preferred_next_step}` : null,
    data.redacted_docs ? `Redacted docs: ${data.redacted_docs}` : null,
    data.address ? `Address: ${[data.address, data.city, data.zip].filter(Boolean).join(", ")}` : null,
    "",
    `Permits (${data.permits.length}): ${data.permits.length ? data.permits.join(", ") : "none selected"}`,
    `Hazards (${data.hazards.length}): ${data.hazards.length ? data.hazards.join(", ") : "none selected"}`,
  ];

  if (data.chemicals) lines.push("", "Chemicals:", data.chemicals);
  if (data.waste_streams) lines.push("", "Waste streams:", data.waste_streams);
  if (data.pain_points) lines.push("", "Pain points:", data.pain_points);
  if (data.goals) lines.push("", "Goals:", data.goals);

  if (adminUrl) {
    lines.push("", `View in admin: ${adminUrl}`);
  }

  return lines.filter((l) => l !== null).join("\n");
}

export async function sendIntakeAlert(data: IntakeFormData): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { sent: false, error: "RESEND_API_KEY / RESEND_FROM not configured." };
  }

  const recipients = getIntakeNotifyEmails();
  if (!recipients.length) {
    return { sent: false, error: "No intake notify recipients configured." };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://greengptadvisory.com").replace(/\/$/, "");
  const text = formatIntakeAlertText(data, `${baseUrl}/admin/intakes`);

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: recipients,
    subject: `Diagnostic request: ${data.company} (${data.state})`,
    text,
  });

  if (error) return { sent: false, error: error.message };
  return { sent: true };
}
