"use client";

import { useCallback, useState, type CSSProperties } from "react";
import Link from "next/link";
import { EMPTY_INTAKE, type IntakeFormData } from "@/lib/managed-compliance/intake";
import {
  MANAGED_BRAND as B,
  managedFonts,
  managedMono as mono,
  managedSans as sans,
  managedSerif as serif,
} from "@/lib/managed-compliance/brand";

const INDUSTRIES = [
  { value: "chemical_mfg", label: "Chemical Manufacturing" },
  { value: "plastics_mfg", label: "Plastics & Rubber Manufacturing" },
  { value: "food_bev", label: "Food & Beverage Processing" },
  { value: "pharma", label: "Pharmaceutical Manufacturing" },
  { value: "metals_mfg", label: "Metals & Metal Products" },
  { value: "oil_gas", label: "Oil & Gas / Energy" },
  { value: "construction", label: "Construction" },
  { value: "warehousing", label: "Warehousing & Distribution" },
  { value: "healthcare", label: "Healthcare" },
  { value: "other", label: "Other" },
];

const STATES = [
  "New Jersey",
  "Pennsylvania",
  "Ohio",
  "Texas",
  "Illinois",
  "California",
  "New York",
  "Florida",
  "Other",
];

const PERMITS = [
  { id: "title_v", label: "Title V Air Permit", cat: "Air" },
  { id: "minor_source", label: "Minor Source Air Permit", cat: "Air" },
  { id: "npdes", label: "NPDES / Stormwater Discharge Permit", cat: "Water" },
  { id: "pretreatment", label: "Pretreatment / Industrial Wastewater Permit", cat: "Water" },
  { id: "rcra_lqg", label: "RCRA Large Quantity Generator", cat: "Waste" },
  { id: "rcra_sqg", label: "RCRA Small Quantity Generator", cat: "Waste" },
  { id: "rcra_vsqg", label: "RCRA Very Small Quantity Generator", cat: "Waste" },
  { id: "spcc", label: "SPCC Plan (oil storage >1,320 gal)", cat: "Spill" },
  { id: "psm_rmp", label: "PSM / RMP Covered Process", cat: "Process Safety" },
  { id: "tier2", label: "Tier II / EPCRA Reporting", cat: "Chemical" },
  { id: "tri", label: "TRI / Form R Reporting", cat: "Chemical" },
];

const HAZARDS = [
  { id: "confined", label: "Confined spaces (permit-required)" },
  { id: "forklifts", label: "Forklifts / powered industrial trucks" },
  { id: "fall", label: "Fall hazards (>6 ft)" },
  { id: "noise", label: "Noise exposure (>85 dBA)" },
  { id: "lead", label: "Lead exposure" },
  { id: "silica", label: "Respirable crystalline silica" },
  { id: "radiation", label: "Radiation sources / X-ray" },
  { id: "ammonia", label: "Ammonia refrigeration" },
  { id: "hot_work", label: "Welding / hot work" },
  { id: "lockout", label: "Lockout/tagout (energy control)" },
];

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1.5px solid #E0E0E0",
  fontSize: 14,
  fontFamily: sans,
  color: "#000",
  outline: "none",
  background: B.white,
  boxSizing: "border-box",
};

function Input({
  label,
  required,
  type = "text",
  placeholder,
  value,
  onChange,
  half,
}: {
  label: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  half?: boolean;
}) {
  return (
    <div style={{ flex: half ? "1 1 48%" : "1 1 100%", minWidth: half ? 200 : "auto" }}>
      <label style={{ display: "block", fontFamily: sans, fontSize: 13, fontWeight: 500, color: B.charcoal, marginBottom: 6 }}>
        {label} {required && <span style={{ color: B.coral }}>*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={fieldStyle}
      />
    </div>
  );
}

function Select({
  label,
  required,
  options,
  value,
  onChange,
  half,
}: {
  label: string;
  required?: boolean;
  options: { value: string; label: string }[] | string[];
  value: string;
  onChange: (v: string) => void;
  half?: boolean;
}) {
  return (
    <div style={{ flex: half ? "1 1 48%" : "1 1 100%", minWidth: half ? 200 : "auto" }}>
      <label style={{ display: "block", fontFamily: sans, fontSize: 13, fontWeight: 500, color: B.charcoal, marginBottom: 6 }}>
        {label} {required && <span style={{ color: B.coral }}>*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required} style={fieldStyle}>
        <option value="">Select...</option>
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lab = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val}>
              {lab}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function CheckGrid({
  items,
  selected,
  toggle,
}: {
  items: { id: string; label: string; cat?: string }[];
  selected: string[];
  toggle: (id: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
      {items.map((item) => {
        const on = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              background: on ? B.mint : B.white,
              border: `1.5px solid ${on ? B.emerald : "#E0E0E0"}`,
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                flexShrink: 0,
                border: `2px solid ${on ? B.emerald : "#CCC"}`,
                background: on ? B.emerald : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: B.white,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {on ? "✓" : ""}
            </span>
            <div>
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: on ? 500 : 300, color: B.charcoal }}>
                {item.label}
              </div>
              {item.cat && <div style={{ fontFamily: mono, fontSize: 10, color: "#999" }}>{item.cat}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SectionHead({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20, marginTop: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: B.emerald,
            color: B.charcoal,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: mono,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {number}
        </div>
        <h3 style={{ fontFamily: serif, fontSize: 22, color: B.forest, margin: 0 }}>{title}</h3>
      </div>
      {subtitle && (
        <p style={{ fontFamily: sans, fontSize: 13, color: "#888", fontWeight: 300, margin: "4px 0 0 38px" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", fontFamily: sans, fontSize: 13, fontWeight: 500, color: B.charcoal, marginBottom: 6 }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{ ...fieldStyle, resize: "vertical" }}
      />
    </div>
  );
}

const STEPS = [
  { title: "Your facility" },
  { title: "Permits & programs" },
  { title: "Workplace hazards" },
  { title: "Current state & goals" },
];

export default function ManagedComplianceIntakeForm() {
  const [data, setData] = useState<IntakeFormData>(EMPTY_INTAKE);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback((field: keyof IntakeFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleList = useCallback((field: "permits" | "hazards", id: string) => {
    setData((prev) => ({
      ...prev,
      [field]: prev[field].includes(id) ? prev[field].filter((x) => x !== id) : [...prev[field], id],
    }));
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to submit intake.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit intake.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: B.bone, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{managedFonts}</style>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontFamily: serif, fontSize: 28, color: B.forest, margin: "0 0 12px" }}>Intake complete</h2>
          <p style={{ fontFamily: sans, fontSize: 15, color: "#666", fontWeight: 300, lineHeight: 1.6 }}>
            We&apos;ll review your facility profile within 24 hours and send your initial compliance calendar and gap
            assessment by email. Your first monthly briefing will arrive within the week.
          </p>
          <div
            style={{
              marginTop: 24,
              padding: 20,
              borderRadius: 12,
              background: B.mint,
              border: `1px solid ${B.sage}`,
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: B.forest,
                marginBottom: 8,
              }}
            >
              What happens next
            </div>
            <div style={{ fontFamily: sans, fontSize: 13, color: B.slate, lineHeight: 1.7 }}>
              1. We map your permits and hazards against our regulatory database
              <br />
              2. You receive your personalized compliance calendar within 24 hours
              <br />
              3. We identify any gaps or overdue obligations
              <br />
              4. Your first monthly compliance briefing arrives by email
              <br />
              5. You review, approve, and we handle the rest
            </div>
          </div>
          <p style={{ marginTop: 24, fontFamily: sans, fontSize: 13, color: "#888" }}>
            <Link href="/briefing/demo" style={{ color: B.forest, fontWeight: 600 }}>
              Preview a sample monthly briefing →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: B.bone }}>
      <style>{managedFonts}</style>

      <div style={{ background: B.forest, color: B.white, padding: "36px 24px 32px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: B.emerald,
              marginBottom: 8,
            }}
          >
            Managed compliance service
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 30, margin: "0 0 8px", fontWeight: 400 }}>Facility intake form</h1>
          <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 300, opacity: 0.6, margin: 0 }}>
            Tell us about your facility. We&apos;ll map your obligations, identify gaps, and deliver your first
            compliance briefing within 48 hours.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 0" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setStep(i)}
              style={{
                flex: "1 1 120px",
                padding: "10px 8px",
                borderRadius: "10px 10px 0 0",
                background: i === step ? B.white : "transparent",
                border: i === step ? "1.5px solid #E0E0E0" : "1.5px solid transparent",
                borderBottom: i === step ? "1.5px solid #fff" : "none",
                fontFamily: sans,
                fontSize: 12,
                fontWeight: i === step ? 600 : 400,
                color: i === step ? B.forest : "#999",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 10, marginRight: 4 }}>{i + 1}.</span> {s.title}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "32px 24px 60px",
          background: B.white,
          borderRadius: "0 0 16px 16px",
          border: "1.5px solid #E0E0E0",
          borderTop: "none",
        }}
      >
        {step === 0 && (
          <div>
            <SectionHead number="1" title="Facility information" subtitle="Basic details about your site and primary contact." />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
              <Input label="Company / facility name" required value={data.company} onChange={(v) => update("company", v)} />
              <Input label="Contact name" required value={data.contact} onChange={(v) => update("contact", v)} half />
              <Input label="Job title" value={data.title} onChange={(v) => update("title", v)} half />
              <Input label="Email" required type="email" value={data.email} onChange={(v) => update("email", v)} half />
              <Input label="Phone" type="tel" value={data.phone} onChange={(v) => update("phone", v)} half />
            </div>
            <SectionHead number="2" title="Location & industry" subtitle="Determines which state agencies and sector-specific regulations apply." />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
              <Input label="Street address" value={data.address} onChange={(v) => update("address", v)} />
              <Input label="City" value={data.city} onChange={(v) => update("city", v)} half />
              <Select label="State" required options={STATES} value={data.state} onChange={(v) => update("state", v)} half />
              <Input label="ZIP" value={data.zip} onChange={(v) => update("zip", v)} half />
              <Select label="Industry" required options={INDUSTRIES} value={data.industry} onChange={(v) => update("industry", v)} half />
              <Input label="NAICS / SIC code (if known)" value={data.naics} onChange={(v) => update("naics", v)} half placeholder="e.g. 325199" />
              <Input label="Number of employees at this site" required value={data.employees} onChange={(v) => update("employees", v)} half type="number" />
              <Input label="Number of shifts" value={data.shifts} onChange={(v) => update("shifts", v)} half placeholder="e.g. 2 shifts, 24/7" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <SectionHead number="3" title="Active permits & programs" subtitle="Check every permit or regulatory program that applies to this facility." />
            <CheckGrid items={PERMITS} selected={data.permits} toggle={(id) => toggleList("permits", id)} />
            <div style={{ marginTop: 24 }}>
              <TextArea
                label="Key chemicals stored or used (list the major ones)"
                value={data.chemicals}
                onChange={(v) => update("chemicals", v)}
                placeholder="e.g. sulfuric acid, toluene, ammonia, sodium hydroxide..."
              />
            </div>
            <div style={{ marginTop: 16 }}>
              <TextArea
                label="Waste streams generated"
                value={data.waste_streams}
                onChange={(v) => update("waste_streams", v)}
                placeholder="e.g. spent solvents (D001), wastewater treatment sludge, used oil..."
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <SectionHead number="4" title="Workplace hazards" subtitle="Check every hazard present at this facility. This activates OSHA-specific training and inspection obligations." />
            <CheckGrid items={HAZARDS} selected={data.hazards} toggle={(id) => toggleList("hazards", id)} />
            <div style={{ marginTop: 24 }}>
              <TextArea
                label="Major equipment (boilers, pressure vessels, cranes, etc.)"
                value={data.equipment}
                onChange={(v) => update("equipment", v)}
                placeholder="e.g. 2 boilers (150 HP), overhead crane (5 ton), 4 propane forklifts..."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <SectionHead number="5" title="Current compliance system" subtitle="Help us understand what you're working with today so we can identify gaps." />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <TextArea
                label="How do you currently track compliance deadlines?"
                value={data.current_system}
                onChange={(v) => update("current_system", v)}
                placeholder="e.g. Excel spreadsheet, Outlook calendar, consultant handles it, not tracking..."
              />
              <TextArea
                label="What's your biggest compliance pain point?"
                value={data.pain_points}
                onChange={(v) => update("pain_points", v)}
                placeholder="e.g. missed a Tier II deadline last year, training records are a mess..."
              />
              <TextArea
                label="Recent inspections or audit history (optional)"
                value={data.audit_history}
                onChange={(v) => update("audit_history", v)}
                placeholder="e.g. EPA inspection in 2024 — no violations..."
              />
              <TextArea
                label="What does success look like for you?"
                value={data.goals}
                onChange={(v) => update("goals", v)}
                placeholder="e.g. never miss a deadline, be audit-ready at all times..."
              />
            </div>
          </div>
        )}

        {error && (
          <p style={{ marginTop: 16, fontFamily: sans, fontSize: 13, color: B.coral, fontWeight: 500 }} role="alert">
            {error}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{
              padding: "12px 24px",
              borderRadius: 10,
              border: "1.5px solid #DDD",
              background: B.white,
              color: B.slate,
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 500,
              cursor: step === 0 ? "default" : "pointer",
              opacity: step === 0 ? 0.3 : 1,
            }}
          >
            ← Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              style={{
                padding: "12px 32px",
                borderRadius: 10,
                border: "none",
                background: B.forest,
                color: B.white,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading}
              style={{
                padding: "12px 32px",
                borderRadius: 10,
                border: "none",
                background: B.emerald,
                color: B.charcoal,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Submitting…" : "Submit intake →"}
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: 32,
            padding: "20px 24px",
            borderRadius: 12,
            background: B.bone,
            border: "1px solid #EEF0ED",
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: B.emerald,
              marginBottom: 8,
            }}
          >
            What you get
          </div>
          <div style={{ fontFamily: sans, fontSize: 13, color: "#666", lineHeight: 1.7 }}>
            Within 48 hours of submitting this form, you&apos;ll receive your personalized compliance calendar, a gap
            assessment showing what you may be missing, and your first monthly compliance briefing. After that, we monitor
            regulatory changes, send deadline reminders, and maintain your compliance program on an ongoing basis. You
            review and approve — we handle the rest.
          </div>
        </div>
      </div>
    </div>
  );
}
