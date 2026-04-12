"use client";
/* eslint-disable @typescript-eslint/no-explicit-any -- rule rows/events are heterogeneous data */
import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// THE GREEN EXECUTIVE BRIEFING — EHS COMPLIANCE CALENDAR GENERATOR
// Brand-matched component for greengptadvisory.com (Next.js / React)
// ═══════════════════════════════════════════════════════════════════════════

// ─── TIER DEFINITIONS ──────────────────────────────────────────────────────
const TIERS = {
  free: {
    label: "Free",
    maxJurisdictions: 0, // federal only
    canExport: false,
    canFilter: true,
    showReminders: false,
    showDocLinks: false,
    maxFacilityFlags: 4,
    cta: "Upgrade to Pro for state rules, export & reminders",
  },
  pro: {
    label: "Pro",
    price: "$49/mo",
    maxJurisdictions: 99,
    canExport: true,
    canFilter: true,
    showReminders: true,
    showDocLinks: true,
    maxFacilityFlags: 99,
    cta: null,
  },
  enterprise: {
    label: "Enterprise",
    price: "$149/mo",
    maxJurisdictions: 99,
    canExport: true,
    canFilter: true,
    showReminders: true,
    showDocLinks: true,
    maxFacilityFlags: 99,
    multiFacility: true,
    cta: null,
  },
};

// ─── BRAND TOKENS ──────────────────────────────────────────────────────────
const BRAND = {
  forest: "#0B3D2E",
  emerald: "#10B981",
  sage: "#6EE7B7",
  mint: "#D1FAE5",
  bone: "#FAFDF7",
  charcoal: "#1B2A22",
  slate: "#374944",
  warmGray: "#F4F2EF",
  gold: "#D4A017",
  coral: "#E8614D",
  white: "#FFFFFF",
};

// ─── REGULATORY DATABASE ───────────────────────────────────────────────────
const INDUSTRIES = {
  manufacturing: { label: "Manufacturing", icon: "🏭", desc: "Chemical, metals, plastics, assembly", sectors: "SIC 20-39" },
  oil_gas: { label: "Oil & Gas / Energy", icon: "⛽", desc: "Upstream, downstream, power gen", sectors: "SIC 13, 49" },
  construction: { label: "Construction", icon: "🏗️", desc: "General, heavy civil, specialty", sectors: "SIC 15-17" },
  healthcare: { label: "Healthcare", icon: "🏥", desc: "Hospitals, clinics, laboratories", sectors: "SIC 80" },
  warehousing: { label: "Warehousing & Logistics", icon: "📦", desc: "Distribution, fulfillment, fleet", sectors: "SIC 42, 50-51" },
  food_bev: { label: "Food & Beverage", icon: "🍴", desc: "Processing, packaging, cold storage", sectors: "SIC 20" },
};

const JURISDICTIONS = {
  CA: { label: "California", sub: "Cal/OSHA · DTSC · CARB", tier: "pro" },
  TX: { label: "Texas", sub: "TCEQ · TWC", tier: "pro" },
  NY: { label: "New York", sub: "DEC · DOL", tier: "pro" },
  IL: { label: "Illinois", sub: "IEPA · IDOL", tier: "pro" },
  PA: { label: "Pennsylvania", sub: "DEP", tier: "pro" },
  OH: { label: "Ohio", sub: "Ohio EPA · BWC", tier: "pro" },
  FL: { label: "Florida", sub: "DEP · OSHA", tier: "pro" },
};

const FACILITY_FLAGS = {
  hazmat_storage: { label: "Hazardous materials storage (>TPQ)", icon: "☣️", tier: "free" },
  air_permits: { label: "Air emission permits (Title V / minor)", icon: "💨", tier: "free" },
  wastewater: { label: "Wastewater discharge (NPDES)", icon: "🌊", tier: "free" },
  hazwaste_gen: { label: "Hazardous waste generator (RCRA)", icon: "🗑️", tier: "free" },
  psm_rmp: { label: "PSM / RMP covered process", icon: "⚠️", tier: "pro" },
  confined_spaces: { label: "Permit-required confined spaces", icon: "🕳️", tier: "pro" },
  powered_vehicles: { label: "Forklifts / powered industrial trucks", icon: "🚜", tier: "pro" },
  fall_hazards: { label: "Fall hazards (>6 ft)", icon: "🪜", tier: "pro" },
  noise_exposure: { label: "High noise (>85 dBA)", icon: "🔊", tier: "pro" },
  radiation: { label: "Radiation sources / X-ray", icon: "☢️", tier: "pro" },
  ammonia_refrig: { label: "Ammonia refrigeration", icon: "❄️", tier: "pro" },
  lead_exposure: { label: "Lead exposure potential", icon: "🧪", tier: "pro" },
};

const CATEGORIES = {
  filing: { label: "Regulatory Filing", color: "#E8614D", icon: "📋" },
  inspection: { label: "Inspection / Monitoring", color: "#3B82F6", icon: "🔍" },
  training: { label: "Training / Certification", color: "#10B981", icon: "🎓" },
  permit: { label: "Permit / License", color: "#D4A017", icon: "📄" },
  reporting: { label: "Reporting / Recordkeeping", color: "#8B5CF6", icon: "📊" },
  maintenance: { label: "Equipment Maintenance", color: "#06B6D4", icon: "🔧" },
};

type CategoryKey = keyof typeof CATEGORIES;

const RULES = [
  // ── UNIVERSAL FEDERAL ──
  { id: "osha300a", name: "OSHA 300A Log Posting", category: "reporting", month: 2, day: 1, endMonth: 4, endDay: 30, description: "Post OSHA 300A Summary (Feb 1 – Apr 30). Required for establishments with 11+ employees.", citation: "29 CFR 1904.32", frequency: "annual", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: [], employeeMin: 11 },
  { id: "osha300_elec", name: "OSHA Electronic Injury Reporting", category: "filing", month: 3, day: 2, description: "Submit Form 300A data electronically via OSHA ITA portal.", citation: "29 CFR 1904.41", frequency: "annual", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: [], employeeMin: 20 },
  { id: "tier2", name: "Tier II Chemical Inventory (EPCRA §312)", category: "filing", month: 3, day: 1, description: "Submit Tier II hazardous chemical inventory to SERC, LEPC, and local fire dept.", citation: "40 CFR 370", frequency: "annual", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "tri_formr", name: "TRI Form R / Form A (EPCRA §313)", category: "filing", month: 7, day: 1, description: "Toxic Release Inventory for listed chemicals above reporting thresholds.", citation: "40 CFR 372", frequency: "annual", authority: "EPA", industries: ["manufacturing", "oil_gas", "food_bev"], jurisdictions: ["federal"], conditions: ["hazmat_storage"], employeeMin: 10 },
  { id: "hazwaste_biennial", name: "Hazardous Waste Biennial Report", category: "filing", month: 3, day: 1, description: "EPA Form 8700-13 A/B for LQGs (even-numbered years).", citation: "40 CFR 262.41", frequency: "biennial", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["hazwaste_gen"] },
  { id: "spcc_review", name: "SPCC Plan Annual Review", category: "inspection", month: 1, day: 15, description: "Review and re-certify Spill Prevention, Control, and Countermeasure plan.", citation: "40 CFR 112.5", frequency: "annual", authority: "EPA", industries: ["manufacturing", "oil_gas", "warehousing"], jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "stormwater_dmr", name: "Stormwater DMR Submission", category: "filing", quarterlyMonths: [3, 6, 9, 12], day: 28, description: "Discharge Monitoring Report for NPDES/stormwater permit.", citation: "40 CFR 122", frequency: "quarterly", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["wastewater"] },
  { id: "psm_audit", name: "PSM Compliance Audit", category: "inspection", month: 1, day: 1, description: "Process Safety Management compliance audit (min. every 3 years).", citation: "29 CFR 1910.119(o)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "oil_gas", "food_bev"], jurisdictions: ["federal"], conditions: ["psm_rmp"] },
  { id: "rmp_update", name: "RMP Plan Review", category: "filing", month: 6, day: 21, description: "Review Risk Management Plan; resubmit every 5 years or post-incident.", citation: "40 CFR 68", frequency: "annual", authority: "EPA", industries: ["manufacturing", "oil_gas", "food_bev"], jurisdictions: ["federal"], conditions: ["psm_rmp"] },

  // ── TRAINING ──
  { id: "hazcom", name: "HazCom / GHS Refresher", category: "training", month: 1, day: 15, description: "Annual Hazard Communication training — SDS, labeling, PPE.", citation: "29 CFR 1910.1200(h)", frequency: "annual", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "hazwoper", name: "HAZWOPER 8-hr Refresher", category: "training", month: 3, day: 15, description: "Annual refresher for HAZWOPER-certified workers.", citation: "29 CFR 1910.120(e)(8)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "oil_gas", "construction"], jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "bbp", name: "Bloodborne Pathogens Training", category: "training", month: 2, day: 1, description: "Annual BBP training for occupationally exposed employees.", citation: "29 CFR 1910.1030(g)(2)", frequency: "annual", authority: "OSHA", industries: ["healthcare", "construction"], jurisdictions: ["federal"], conditions: [] },
  { id: "forklift", name: "Forklift Operator Re-Evaluation", category: "training", month: 4, day: 1, description: "PIT operator competency evaluation (every 3 years min).", citation: "29 CFR 1910.178(l)", frequency: "triennial", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: ["powered_vehicles"] },
  { id: "confined", name: "Confined Space Entry Training", category: "training", month: 5, day: 1, description: "PRCS program review & entrant/attendant/supervisor refresher.", citation: "29 CFR 1910.146(g)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "oil_gas", "construction"], jurisdictions: ["federal"], conditions: ["confined_spaces"] },
  { id: "fall", name: "Fall Protection Training", category: "training", month: 2, day: 15, description: "Annual fall protection training for workers at heights >6 ft.", citation: "29 CFR 1926.503", frequency: "annual", authority: "OSHA", industries: ["construction"], jurisdictions: ["federal"], conditions: ["fall_hazards"] },
  { id: "hearing", name: "Hearing Conservation Program", category: "training", month: 6, day: 1, description: "Annual audiometric testing + training for noise-exposed workers.", citation: "29 CFR 1910.95", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "construction", "oil_gas"], jurisdictions: ["federal"], conditions: ["noise_exposure"] },
  { id: "rcra_train", name: "RCRA Hazardous Waste Training", category: "training", month: 1, day: 31, description: "Annual training for personnel managing hazardous waste.", citation: "40 CFR 265.16", frequency: "annual", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["hazwaste_gen"] },
  { id: "radiation", name: "Radiation Safety Refresher", category: "training", month: 4, day: 15, description: "Annual refresher — dosimetry, ALARA, emergency procedures.", citation: "10 CFR 19.12", frequency: "annual", authority: "NRC", industries: ["healthcare"], jurisdictions: ["federal"], conditions: ["radiation"] },

  // ── INSPECTIONS / MAINTENANCE ──
  { id: "fire_monthly", name: "Fire Extinguisher Monthly Check", category: "inspection", monthlyDay: 1, description: "Visual inspection of all portable fire extinguishers.", citation: "29 CFR 1910.157(e)", frequency: "monthly", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: [] },
  { id: "fire_annual", name: "Fire Extinguisher Annual Service", category: "maintenance", month: 1, day: 10, description: "Professional annual maintenance per NFPA 10.", citation: "NFPA 10 §7.3", frequency: "annual", authority: "NFPA", industries: "all", jurisdictions: ["federal"], conditions: [] },
  { id: "eyewash_weekly", name: "Eyewash / Shower Weekly Test", category: "inspection", weeklyDay: "Monday", description: "Activate plumbed eyewash stations and safety showers.", citation: "ANSI Z358.1 §5", frequency: "weekly", authority: "ANSI", industries: "all", jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "crane", name: "Crane / Hoist Annual Inspection", category: "maintenance", month: 3, day: 1, description: "Annual thorough examination of cranes, hoists, lifting devices.", citation: "29 CFR 1910.179(j)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "construction", "warehousing"], jurisdictions: ["federal"], conditions: [] },
  { id: "generator", name: "Emergency Generator Monthly Test", category: "maintenance", monthlyDay: 15, description: "Monthly load test per NFPA 110.", citation: "NFPA 110 §8.4", frequency: "monthly", authority: "NFPA", industries: "all", jurisdictions: ["federal"], conditions: [] },
  { id: "ldar", name: "LDAR Fugitive Emissions Monitoring", category: "inspection", quarterlyMonths: [1, 4, 7, 10], day: 15, description: "Leak Detection & Repair for valves, pumps, connectors.", citation: "40 CFR 60/63", frequency: "quarterly", authority: "EPA", industries: ["manufacturing", "oil_gas"], jurisdictions: ["federal"], conditions: ["air_permits"] },
  { id: "boiler", name: "Boiler / Pressure Vessel Inspection", category: "maintenance", month: 9, day: 1, description: "Annual boiler and pressure vessel inspection.", citation: "ASME / State", frequency: "annual", authority: "State", industries: ["manufacturing", "healthcare", "food_bev"], jurisdictions: ["federal"], conditions: [] },
  { id: "ammonia", name: "Ammonia System Quarterly Check", category: "maintenance", quarterlyMonths: [1, 4, 7, 10], day: 1, description: "Inspection of ammonia refrigeration components & safety devices.", citation: "IIAR 6 / 29 CFR 1910.119", frequency: "quarterly", authority: "OSHA/IIAR", industries: ["food_bev", "warehousing"], jurisdictions: ["federal"], conditions: ["ammonia_refrig"] },

  // ── CALIFORNIA ──
  { id: "ca_prop65", name: "Prop 65 Warning Review", category: "reporting", month: 1, day: 31, description: "Review Proposition 65 chemical exposure warnings & signage.", citation: "CA HSC §25249.6", frequency: "annual", authority: "OEHHA", industries: "all", jurisdictions: ["CA"], conditions: ["hazmat_storage"] },
  { id: "ca_hmbp", name: "HMBP / CUPA Annual Filing", category: "filing", month: 3, day: 1, description: "Submit Hazardous Materials Business Plan via CERS portal.", citation: "CA HSC §25505", frequency: "annual", authority: "CalEPA", industries: "all", jurisdictions: ["CA"], conditions: ["hazmat_storage"] },
  { id: "ca_iipp", name: "IIPP Annual Review", category: "inspection", month: 2, day: 15, description: "Review & update Injury and Illness Prevention Program.", citation: "8 CCR §3203", frequency: "annual", authority: "Cal/OSHA", industries: "all", jurisdictions: ["CA"], conditions: [] },
  { id: "ca_heat", name: "Heat Illness Prevention Plan Update", category: "inspection", month: 4, day: 1, description: "Update Heat Illness Prevention procedures before warm season.", citation: "8 CCR §3395", frequency: "annual", authority: "Cal/OSHA", industries: ["construction", "warehousing"], jurisdictions: ["CA"], conditions: [] },

  // ── TEXAS ──
  { id: "tx_emi", name: "TCEQ Emissions Inventory", category: "filing", month: 3, day: 31, description: "Annual point source emissions inventory submission.", citation: "30 TAC §101.10", frequency: "annual", authority: "TCEQ", industries: ["manufacturing", "oil_gas"], jurisdictions: ["TX"], conditions: ["air_permits"] },
  { id: "tx_tier2", name: "TCEQ Tier II Filing", category: "filing", month: 3, day: 1, description: "Texas-specific Tier II with additional LEPC requirements.", citation: "THSC §505", frequency: "annual", authority: "TCEQ", industries: "all", jurisdictions: ["TX"], conditions: ["hazmat_storage"] },
  { id: "tx_sw", name: "TPDES Stormwater Renewal", category: "permit", month: 8, day: 1, description: "Multi-Sector General Permit review & NOI renewal.", citation: "30 TAC §281", frequency: "annual", authority: "TCEQ", industries: ["manufacturing", "construction"], jurisdictions: ["TX"], conditions: ["wastewater"] },

  // ── NEW YORK ──
  { id: "ny_crk", name: "NY Community Right-to-Know Filing", category: "filing", month: 3, day: 1, description: "Chemical reporting under NY Community Right-to-Know.", citation: "NY ECL §37", frequency: "annual", authority: "NY DEC", industries: "all", jurisdictions: ["NY"], conditions: ["hazmat_storage"] },
  { id: "ny_bulk", name: "PBS / CBS Registration Renewal", category: "permit", month: 7, day: 1, description: "Petroleum / Chemical Bulk Storage registration renewal.", citation: "6 NYCRR §613", frequency: "annual", authority: "NY DEC", industries: ["manufacturing", "oil_gas", "warehousing"], jurisdictions: ["NY"], conditions: ["hazmat_storage"] },
];

// ─── ENGINE ────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateEvents(rules: any[], industry: string, jurisdictions: string[], flags: string[], employeeCount: number) {
  const events: any[] = [];
  const activeJ = new Set(["federal", ...jurisdictions]);
  const activeF = new Set(flags);
  for (const r of rules) {
    if (r.industries !== "all" && !r.industries.includes(industry)) continue;
    if (!r.jurisdictions.some((j: string) => activeJ.has(j))) continue;
    if (r.conditions.length > 0 && !r.conditions.some((c: string) => activeF.has(c))) continue;
    if (r.employeeMin && employeeCount < r.employeeMin) continue;
    if (r.monthlyDay) {
      for (let m = 0; m < 12; m++) events.push({ ...r, eventMonth: m, eventDay: r.monthlyDay, sk: m * 100 + r.monthlyDay });
    } else if (r.weeklyDay) {
      for (let m = 0; m < 12; m++) events.push({ ...r, eventMonth: m, eventDay: null, sk: m * 100 + 1, note: `Every ${r.weeklyDay}` });
    } else if (r.quarterlyMonths) {
      for (const qm of r.quarterlyMonths) events.push({ ...r, eventMonth: qm - 1, eventDay: r.day, sk: (qm - 1) * 100 + r.day });
    } else if (r.month) {
      events.push({ ...r, eventMonth: r.month - 1, eventDay: r.day, sk: (r.month - 1) * 100 + r.day });
    }
  }
  return events.sort((a, b) => a.sk - b.sk);
}

// ─── ANIMATIONS ────────────────────────────────────────────────────────────
const keyframes = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;

// ─── SUB COMPONENTS ────────────────────────────────────────────────────────

function ProBadge() {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600,
      background: `linear-gradient(135deg, ${BRAND.gold}, #E8B931)`,
      color: BRAND.charcoal, padding: "2px 7px", borderRadius: 4,
      letterSpacing: 1, textTransform: "uppercase", marginLeft: 6,
      display: "inline-block",
    }}>PRO</span>
  );
}

function LockedOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(11,61,46,0.06)",
      borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(1px)", zIndex: 2, cursor: "not-allowed",
    }}>
      <div style={{
        background: BRAND.white, borderRadius: 8, padding: "8px 16px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
        color: BRAND.forest, display: "flex", alignItems: "center", gap: 6,
      }}>
        🔒 Pro Feature
      </div>
    </div>
  );
}

function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 36 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: i < step ? BRAND.forest : i === step ? BRAND.emerald : BRAND.warmGray,
            color: i <= step ? BRAND.white : BRAND.slate,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600,
            transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: i === step ? `0 0 0 4px ${BRAND.mint}` : "none",
          }}>{i + 1}</div>
          {i < total - 1 && <div style={{
            width: 32, height: 2, borderRadius: 1,
            background: i < step ? BRAND.forest : "#E5E7EB",
            transition: "all 0.35s ease",
          }} />}
        </div>
      ))}
      <div style={{ marginLeft: "auto", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: BRAND.slate }}>
        Step {step + 1} of {total}
      </div>
    </div>
  );
}

function IndustryCard({
  id,
  data,
  selected,
  onClick,
  delay,
}: {
  id: string;
  data: (typeof INDUSTRIES)[keyof typeof INDUSTRIES];
  selected: string | null;
  onClick: (id: string) => void;
  delay: number;
}) {
  const active = selected === id;
  return (
    <button onClick={() => onClick(id)} style={{
      background: active ? BRAND.forest : BRAND.white,
      color: active ? BRAND.white : BRAND.charcoal,
      border: `2px solid ${active ? BRAND.forest : "#E8ECE9"}`,
      borderRadius: 14, padding: "22px 18px", cursor: "pointer",
      textAlign: "left", transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
      transform: active ? "scale(1.03)" : "scale(1)",
      boxShadow: active ? `0 8px 24px rgba(11,61,46,0.25)` : "0 1px 3px rgba(0,0,0,0.04)",
      animation: `fadeUp 0.4s ease ${delay}s both`,
      position: "relative", overflow: "hidden",
    }}>
      {active && <div style={{
        position: "absolute", top: -20, right: -20, width: 60, height: 60,
        borderRadius: "50%", background: "rgba(16,185,129,0.2)",
      }} />}
      <div style={{ fontSize: 30, marginBottom: 8, position: "relative" }}>{data.icon}</div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 3, position: "relative" }}>{data.label}</div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, opacity: 0.6, fontWeight: 300, position: "relative" }}>{data.desc}</div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, opacity: 0.4,
        marginTop: 6, position: "relative",
      }}>{data.sectors}</div>
    </button>
  );
}

function FlagToggle({
  label,
  icon,
  active,
  onClick,
  locked,
}: {
  label: ReactNode;
  icon: string;
  active: boolean;
  onClick: () => void;
  locked: boolean;
}) {
  return (
    <div style={{ position: "relative" }}>
      {locked && <LockedOverlay />}
      <button onClick={locked ? undefined : onClick} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
        background: active ? BRAND.mint : BRAND.white,
        border: `1.5px solid ${active ? BRAND.emerald : "#E8ECE9"}`,
        borderRadius: 10, cursor: locked ? "not-allowed" : "pointer",
        textAlign: "left", transition: "all 0.15s ease", width: "100%",
        opacity: locked ? 0.5 : 1,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12.5, fontWeight: active ? 500 : 300, color: BRAND.charcoal, flex: 1 }}>{label}</span>
        <span style={{
          width: 20, height: 20, borderRadius: 5,
          border: `2px solid ${active ? BRAND.emerald : "#CCC"}`,
          background: active ? BRAND.emerald : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: BRAND.white, fontSize: 11, fontWeight: 700,
          transition: "all 0.15s ease", flexShrink: 0,
        }}>{active ? "✓" : ""}</span>
      </button>
    </div>
  );
}

// ─── CALENDAR VIEWS ────────────────────────────────────────────────────────

function MonthGrid({ events }: { events: any[] }) {
  const byMonth = useMemo(() => {
    const m: any[][] = Array.from({ length: 12 }, () => []);
    events.forEach((e) => m[e.eventMonth].push(e));
    return m;
  }, [events]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      {byMonth.map((evts, i) => (
        <div key={i} style={{
          background: BRAND.white, borderRadius: 14, padding: "18px 16px",
          border: `1.5px solid ${evts.length > 3 ? BRAND.sage : "#EEF0ED"}`,
          minHeight: 150, animation: `fadeUp 0.3s ease ${i * 0.04}s both`,
          boxShadow: evts.length > 3 ? `0 2px 12px rgba(16,185,129,0.08)` : "none",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 12,
          }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: BRAND.forest }}>{MONTHS[i]}</span>
            {evts.length > 0 && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                background: BRAND.forest, color: BRAND.white, padding: "2px 8px",
                borderRadius: 10,
              }}>{evts.length}</span>
            )}
          </div>
          {evts.length === 0 && (
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12, color: "#CCC", fontStyle: "italic" }}>No deadlines</div>
          )}
          {evts.slice(0, 5).map((e, j) => (
            <div key={j} style={{
              display: "flex", alignItems: "flex-start", gap: 7, padding: "4px 0",
              borderBottom: j < Math.min(evts.length, 5) - 1 ? `1px solid ${BRAND.warmGray}` : "none",
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                background: CATEGORIES[e.category as CategoryKey]?.color,
              }} />
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: BRAND.slate, lineHeight: 1.35, fontWeight: 300 }}>
                {e.eventDay && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, marginRight: 4, color: BRAND.forest, fontSize: 10 }}>{e.eventDay}</span>}
                {e.name}
              </div>
            </div>
          ))}
          {evts.length > 5 && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#AAA", marginTop: 4 }}>+{evts.length - 5} more</div>
          )}
        </div>
      ))}
    </div>
  );
}

function TimelineView({ events }: { events: any[] }) {
  const byMonth = useMemo(() => {
    const m: Record<number, any[]> = {};
    events.forEach((e) => {
      if (!m[e.eventMonth]) m[e.eventMonth] = [];
      m[e.eventMonth].push(e);
    });
    return m;
  }, [events]);

  return (
    <div style={{ position: "relative", paddingLeft: 30 }}>
      <div style={{ position: "absolute", left: 11, top: 0, bottom: 0, width: 2, background: BRAND.sage }} />
      {Object.entries(byMonth)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([mo, evts], idx) => (
        <div key={mo} style={{ marginBottom: 28, position: "relative", animation: `slideIn 0.35s ease ${idx * 0.06}s both` }}>
          <div style={{
            position: "absolute", left: -25, top: 5, width: 12, height: 12,
            borderRadius: "50%", background: BRAND.forest, border: `3px solid ${BRAND.mint}`,
          }} />
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: BRAND.forest, marginBottom: 12 }}>
            {MONTH_FULL[parseInt(mo)]}
          </div>
          {evts.map((e, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              background: BRAND.white, borderRadius: 12, padding: "14px 18px",
              border: `1.5px solid #EEF0ED`, marginBottom: 8,
              boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
              transition: "box-shadow 0.2s ease",
            }}>
              <div style={{
                minWidth: 38, textAlign: "center",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600,
                color: CATEGORIES[e.category as CategoryKey]?.color,
                background: `${CATEGORIES[e.category as CategoryKey]?.color}12`, padding: "3px 6px",
                borderRadius: 6,
              }}>{e.eventDay || "~"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13.5, color: BRAND.charcoal, marginBottom: 3 }}>{e.name}</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11.5, color: "#777", fontWeight: 300, lineHeight: 1.45 }}>{e.description}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600,
                    padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.4,
                    background: `${CATEGORIES[e.category as CategoryKey]?.color}15`, color: CATEGORIES[e.category as CategoryKey]?.color,
                  }}>{CATEGORIES[e.category as CategoryKey]?.label}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "#F3F4F6", color: "#666" }}>{e.authority}</span>
                  {e.citation && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "#F3F4F6", color: "#999" }}>{e.citation}</span>}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "#F3F4F6", color: "#666" }}>{e.frequency}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Stats({ events }: { events: any[] }) {
  const stats = useMemo(() => {
    const s = {} as Record<CategoryKey, number>;
    (Object.keys(CATEGORIES) as CategoryKey[]).forEach((k) => (s[k] = 0));
    events.forEach((e) => {
      s[e.category as CategoryKey]++;
    });
    return s;
  }, [events]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 24 }}>
      {Object.entries(CATEGORIES).map(([k, c], i) => (
        <div key={k} style={{
          background: BRAND.white, borderRadius: 12, padding: "16px 12px",
          border: `1.5px solid #EEF0ED`, textAlign: "center",
          animation: `fadeUp 0.3s ease ${i * 0.05}s both`,
        }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 700,
            color: c.color, lineHeight: 1,
          }}>{stats[k as CategoryKey]}</div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 10, color: "#999", marginTop: 4, fontWeight: 400 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────

export type EHSTier = "free" | "pro" | "enterprise";

export type EHSCalendarGeneratorProps = {
  tier?: EHSTier;
  onUpgrade?: (email: string) => void;
  upgradeLoading?: boolean;
};

export default function EHSCalendarGenerator({
  tier: initialTier = "free",
  onUpgrade,
  upgradeLoading = false,
}: EHSCalendarGeneratorProps) {
  const [tier, setTier] = useState<EHSTier>(initialTier);

  useEffect(() => {
    setTier(initialTier);
  }, [initialTier]);

  const [step, setStep] = useState(0);
  const [industry, setIndustry] = useState<string | null>(null);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [employees, setEmployees] = useState(50);
  const [calView, setCalView] = useState("grid");
  const [filterCat, setFilterCat] = useState<CategoryKey | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const startProLocal = useCallback(() => {
    setTier("pro");
    setShowUpgrade(false);
  }, []);

  const startProOrCheckout = useCallback(() => {
    if (onUpgrade) {
      const email =
        typeof window !== "undefined"
          ? window.prompt("Enter your email to continue:")
          : null;
      if (email) onUpgrade(email.trim());
    } else {
      startProLocal();
    }
  }, [onUpgrade, startProLocal]);

  const tierConfig = TIERS[tier];

  const toggleJ = useCallback((j: string) => {
    if (tier === "free") { setShowUpgrade(true); return; }
    setJurisdictions(p => p.includes(j) ? p.filter(x => x !== j) : [...p, j]);
  }, [tier]);

  const toggleF = useCallback((f: keyof typeof FACILITY_FLAGS) => {
    const flagData = FACILITY_FLAGS[f];
    if (flagData.tier === "pro" && tier === "free") { setShowUpgrade(true); return; }
    setFlags(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  }, [tier]);

  const events = useMemo(() => {
    if (!industry) return [];
    let e = generateEvents(RULES, industry, jurisdictions, flags, employees);
    if (filterCat) e = e.filter((ev) => ev.category === filterCat);
    return e;
  }, [industry, jurisdictions, flags, employees, filterCat]);

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bone }}>
      <style>{keyframes}</style>

      {/* ── UPGRADE MODAL ── */}
      {showUpgrade && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,61,46,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          backdropFilter: "blur(4px)",
        }} onClick={() => setShowUpgrade(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: BRAND.white, borderRadius: 20, padding: 40, maxWidth: 480,
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            animation: "fadeUp 0.3s ease both",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔓</div>
            <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, color: BRAND.forest, margin: "0 0 8px" }}>
              Unlock Full Compliance Coverage
            </h3>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, color: "#666", fontWeight: 300, lineHeight: 1.6, margin: "0 0 24px" }}>
              Pro includes state-specific rules (CA, TX, NY, IL, PA, OH, FL), all 12 facility hazard flags, calendar export, email deadline reminders, and document attachment.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={startProOrCheckout}
                disabled={upgradeLoading}
                style={{
                flex: 1, background: BRAND.forest, color: BRAND.white, border: "none",
                borderRadius: 10, padding: "14px 20px", fontSize: 14, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif", cursor: upgradeLoading ? "wait" : "pointer",
                opacity: upgradeLoading ? 0.85 : 1,
              }}>
                {upgradeLoading ? "Redirecting to checkout..." : "Start Pro — $49/mo"}
              </button>
              <button onClick={() => setShowUpgrade(false)} style={{
                background: "transparent", color: BRAND.slate, border: `1.5px solid #DDD`,
                borderRadius: 10, padding: "14px 20px", fontSize: 14, fontWeight: 500,
                fontFamily: "'Outfit', sans-serif", cursor: "pointer",
              }}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{
        background: BRAND.forest, color: BRAND.white, padding: "36px 40px 32px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 240, height: 240, borderRadius: "50%", background: "rgba(16,185,129,0.12)" }} />
        <div style={{ position: "absolute", bottom: -50, right: 120, width: 160, height: 160, borderRadius: "50%", background: "rgba(110,231,183,0.08)" }} />
        <div style={{ position: "absolute", top: 20, left: -40, width: 100, height: 100, borderRadius: "50%", background: "rgba(212,160,23,0.06)" }} />

        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
              letterSpacing: 3, textTransform: "uppercase", color: BRAND.emerald,
              marginBottom: 10,
            }}>The Green Executive Briefing</div>
            <h1 style={{
              fontFamily: "'Instrument Serif', serif", fontSize: 34, fontWeight: 400,
              margin: 0, lineHeight: 1.1,
            }}>EHS Compliance Calendar</h1>
            <p style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 300,
              opacity: 0.6, margin: "10px 0 0", maxWidth: 520,
            }}>
              Configure your facility profile. Our rules engine maps applicable federal and state obligations into a personalized, audit-ready compliance calendar.
            </p>
          </div>

          {/* Tier indicator */}
          <div style={{
            background: tier === "free" ? "rgba(255,255,255,0.1)" : `linear-gradient(135deg, ${BRAND.gold}, #E8B931)`,
            borderRadius: 10, padding: "10px 18px", display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: tier === "free" ? BRAND.sage : BRAND.charcoal, marginBottom: 2 }}>{tierConfig.label}</span>
            {tier === "free" && <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, opacity: 0.6 }}>Federal Only</span>}
            {tier === "pro" && <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: BRAND.charcoal, fontWeight: 600 }}>$49/mo</span>}
            {tier === "enterprise" && <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 11, color: BRAND.charcoal, fontWeight: 600 }}>$149/mo</span>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px" }}>

        {step < 3 && <StepBar step={step} total={3} />}

        {/* ════════ STEP 0: INDUSTRY ════════ */}
        {step === 0 && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, margin: "0 0 4px", color: BRAND.forest }}>Select Your Industry</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#888", fontWeight: 300, margin: "0 0 24px" }}>Determines applicable OSHA standards, EPA programs, and sector-specific regulations.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
              {Object.entries(INDUSTRIES).map(([id, d], i) => (
                <IndustryCard key={id} id={id} data={d} selected={industry} onClick={setIndustry} delay={i * 0.06} />
              ))}
            </div>
            <button disabled={!industry} onClick={() => setStep(1)} style={{
              background: industry ? BRAND.forest : "#DDD",
              color: BRAND.white, border: "none", borderRadius: 10,
              padding: "14px 36px", fontSize: 14, fontWeight: 600,
              fontFamily: "'Outfit', sans-serif", cursor: industry ? "pointer" : "default",
              transition: "all 0.2s ease",
            }}>Continue →</button>
          </div>
        )}

        {/* ════════ STEP 1: JURISDICTIONS + EMPLOYEES ════════ */}
        {step === 1 && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, margin: "0 0 4px", color: BRAND.forest }}>Jurisdiction & Workforce</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#888", fontWeight: 300, margin: "0 0 24px" }}>
              Federal rules are always included. State programs add additional obligations.
              {tier === "free" && <span style={{ color: BRAND.gold, fontWeight: 500 }}> State rules require Pro.</span>}
            </p>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                letterSpacing: 1.5, textTransform: "uppercase", color: "#999",
                display: "block", marginBottom: 12,
              }}>State Jurisdictions {tier === "free" && <ProBadge />}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {Object.entries(JURISDICTIONS).map(([k, v]) => (
                  <div key={k} style={{ position: "relative" }}>
                    {tier === "free" && <LockedOverlay />}
                    <FlagToggle label={`${v.label} — ${v.sub}`} icon="📍" active={jurisdictions.includes(k)} onClick={() => toggleJ(k)} locked={tier === "free"} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                letterSpacing: 1.5, textTransform: "uppercase", color: "#999",
                display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
              }}>
                Employee Count
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 18,
                  color: BRAND.emerald, fontWeight: 700,
                }}>{employees}</span>
              </label>
              <input type="range" min={1} max={500} value={employees} onChange={e => setEmployees(+e.target.value)}
                style={{ width: "100%", accentColor: BRAND.emerald, height: 6 }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: "#CCC", marginTop: 4 }}>
                <span>1</span><span>50</span><span>100</span><span>250</span><span>500</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(0)} style={{ background: BRAND.white, color: BRAND.slate, border: "1.5px solid #DDD", borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>← Back</button>
              <button onClick={() => setStep(2)} style={{ background: BRAND.forest, color: BRAND.white, border: "none", borderRadius: 10, padding: "13px 36px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>Continue →</button>
            </div>
          </div>
        )}

        {/* ════════ STEP 2: FACILITY FLAGS ════════ */}
        {step === 2 && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, margin: "0 0 4px", color: BRAND.forest }}>Facility Hazard Profile</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#888", fontWeight: 300, margin: "0 0 24px" }}>
              Each flag activates specific regulatory obligations. Free tier includes 4 core flags.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 32 }}>
              {Object.entries(FACILITY_FLAGS).map(([k, d]) => (
                <FlagToggle key={k} label={<>{d.label} {d.tier === "pro" && tier === "free" && <ProBadge />}</>} icon={d.icon}
                  active={flags.includes(k)}
                  onClick={() => toggleF(k as keyof typeof FACILITY_FLAGS)}
                  locked={d.tier === "pro" && tier === "free"}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ background: BRAND.white, color: BRAND.slate, border: "1.5px solid #DDD", borderRadius: 10, padding: "13px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>← Back</button>
              <button onClick={() => setStep(3)} style={{ background: BRAND.emerald, color: BRAND.charcoal, border: "none", borderRadius: 10, padding: "13px 36px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Outfit', sans-serif", boxShadow: `0 4px 16px rgba(16,185,129,0.3)` }}>Generate Calendar →</button>
            </div>
          </div>
        )}

        {/* ════════ STEP 3: RESULTS ════════ */}
        {step === 3 && (
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, margin: "0 0 4px", color: BRAND.forest }}>
                  Your Compliance Calendar
                </h2>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, color: "#888", fontWeight: 300, margin: 0 }}>
                  <strong style={{ color: BRAND.emerald, fontWeight: 700 }}>{events.length}</strong> obligations ·{" "}
                  {industry ? INDUSTRIES[industry as keyof typeof INDUSTRIES]?.label : "—"} ·{" "}
                  {jurisdictions.length > 0 ? `Federal + ${jurisdictions.join(", ")}` : "Federal"} · {employees} employees
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setStep(0)} style={{ background: BRAND.white, color: BRAND.slate, border: "1.5px solid #DDD", borderRadius: 8, padding: "9px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>← Reconfigure</button>

                {tier !== "free" && (
                  <button style={{
                    background: BRAND.forest, color: BRAND.white, border: "none", borderRadius: 8,
                    padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", gap: 6,
                  }}>📅 Export .ics</button>
                )}

                <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #E0E0E0" }}>
                  {[["grid", "Grid"], ["timeline", "Timeline"]].map(([v, l]) => (
                    <button key={v} onClick={() => setCalView(v)} style={{
                      background: calView === v ? BRAND.forest : BRAND.white,
                      color: calView === v ? BRAND.white : "#888",
                      border: "none", padding: "9px 16px", fontSize: 12,
                      fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                    }}>{l}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category filter pills */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
              <button onClick={() => setFilterCat(null)} style={{
                background: !filterCat ? BRAND.forest : BRAND.white,
                color: !filterCat ? BRAND.white : "#888",
                border: `1.5px solid ${!filterCat ? BRAND.forest : "#E0E0E0"}`,
                borderRadius: 20, padding: "6px 16px", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              }}>All ({events.length})</button>
              {Object.entries(CATEGORIES).map(([k, c]) => (
                <button key={k} type="button" onClick={() => setFilterCat(filterCat === k ? null : (k as CategoryKey))} style={{
                  background: filterCat === k ? c.color : BRAND.white,
                  color: filterCat === k ? BRAND.white : c.color,
                  border: `1.5px solid ${filterCat === k ? c.color : "#E0E0E0"}`,
                  borderRadius: 20, padding: "6px 14px", fontSize: 11,
                  fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                }}>{c.icon} {c.label}</button>
              ))}
            </div>

            <Stats events={events} />

            {calView === "grid" ? <MonthGrid events={events} /> : <TimelineView events={events} />}

            {/* ── FREE TIER UPSELL ── */}
            {tier === "free" && (
              <div style={{
                marginTop: 32, padding: 28, borderRadius: 16,
                background: `linear-gradient(135deg, ${BRAND.forest}, #0D4F3A)`,
                color: BRAND.white, position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(16,185,129,0.15)" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: BRAND.gold, marginBottom: 8 }}>
                    {"You're Seeing Federal Rules Only"}
                  </div>
                  <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, margin: "0 0 8px", fontWeight: 400 }}>
                    Unlock state-specific obligations, export, and reminders
                  </h3>
                  <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, opacity: 0.7, lineHeight: 1.6, margin: "0 0 20px", maxWidth: 560 }}>
                    Pro adds 7 state jurisdictions, 8 additional facility flags, .ics calendar export, email reminders at 30/60/90 days, CFR citation links, and document attachment per obligation.
                  </p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="button"
                      onClick={startProOrCheckout}
                      disabled={upgradeLoading}
                      style={{
                      background: BRAND.emerald, color: BRAND.charcoal, border: "none",
                      borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif", cursor: upgradeLoading ? "wait" : "pointer",
                    }}>{upgradeLoading ? "Redirecting..." : "Upgrade to Pro — $49/mo"}</button>
                    <button style={{
                      background: "rgba(255,255,255,0.1)", color: BRAND.white,
                      border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 10,
                      padding: "13px 24px", fontSize: 14, fontWeight: 500,
                      fontFamily: "'Outfit', sans-serif", cursor: "pointer",
                    }}>Talk to an Advisor →</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── CONSULTING CTA ── */}
            <div style={{
              marginTop: 24, padding: 24, borderRadius: 14,
              background: BRAND.white, border: `2px solid ${BRAND.sage}`,
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <div style={{ fontSize: 40 }}>📞</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15, color: BRAND.forest, marginBottom: 4 }}>
                  Need help closing compliance gaps?
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 300, color: "#666", lineHeight: 1.5 }}>
                  Our EHS consultants can audit your program against this calendar, build SOPs for each obligation, and set up your management system for ISO 14001 certification.
                </div>
              </div>
              <a href="https://cal.com/the-green-executive-briefing" target="_blank" rel="noopener" style={{
                background: BRAND.forest, color: BRAND.white, border: "none",
                borderRadius: 10, padding: "12px 24px", fontSize: 13, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif", cursor: "pointer", textDecoration: "none",
                whiteSpace: "nowrap",
              }}>Book a Call</a>
            </div>

            {/* ── DIFFERENTIATOR ── */}
            <div style={{
              marginTop: 24, padding: "20px 24px", borderRadius: 12,
              background: BRAND.warmGray, border: "1px solid #E8E8E4",
            }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: BRAND.slate, marginBottom: 6 }}>
                How This Works
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 12.5, fontWeight: 300, color: "#666", lineHeight: 1.6 }}>
                This calendar is generated by a <strong style={{ fontWeight: 600, color: BRAND.forest }}>structured regulatory rules engine</strong> — not a language model. Each obligation maps to a specific CFR citation, has coded trigger conditions, and respects federal → state jurisdiction hierarchy. Every deadline is deterministic and auditable.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
