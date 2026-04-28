// Shared EHS landing rules engine (server + client). No React imports.

export const CATEGORIES = {
  filing: { label: "Regulatory Filing", color: "#E8614D", icon: "📋" },
  inspection: { label: "Inspection", color: "#3B82F6", icon: "🔍" },
  training: { label: "Training", color: "#10B981", icon: "🎓" },
  permit: { label: "Permit / License", color: "#D4A017", icon: "📄" },
  reporting: { label: "Reporting", color: "#8B5CF6", icon: "📊" },
  maintenance: { label: "Maintenance", color: "#06B6D4", icon: "🔧" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export interface LandingRule {
  id?: string;
  name: string;
  category: CategoryKey;
  industries: "all" | string[];
  jurisdictions: string[];
  conditions: string[];
  employeeMin?: number;
  monthlyDay?: number;
  weeklyDay?: string;
  quarterlyMonths?: number[];
  month?: number;
  day?: number;
  description?: string;
  citation?: string;
  frequency?: string;
  authority?: string;
}

export type LandingEvent = LandingRule & {
  eM: number;
  eD: number | null;
  sk: number;
  note?: string;
};

export const RULES: LandingRule[] = [
  { id: "osha300a", name: "OSHA 300A Log Posting", category: "reporting", month: 2, day: 1, description: "Post OSHA 300A Summary (Feb 1 – Apr 30)", citation: "29 CFR 1904.32", frequency: "annual", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: [], employeeMin: 11 },
  { id: "osha300e", name: "OSHA Electronic Injury Reporting", category: "filing", month: 3, day: 2, description: "Submit Form 300A data via ITA portal", citation: "29 CFR 1904.41", frequency: "annual", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: [], employeeMin: 20 },
  { id: "tier2", name: "Tier II Chemical Inventory (EPCRA §312)", category: "filing", month: 3, day: 1, description: "Submit Tier II to SERC, LEPC, and fire dept", citation: "40 CFR 370", frequency: "annual", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "tri", name: "TRI Form R (EPCRA §313)", category: "filing", month: 7, day: 1, description: "Toxic Release Inventory for listed chemicals", citation: "40 CFR 372", frequency: "annual", authority: "EPA", industries: ["manufacturing", "oil_gas", "food_bev"], jurisdictions: ["federal"], conditions: ["hazmat_storage"], employeeMin: 10 },
  { id: "hazbi", name: "Hazardous Waste Biennial Report", category: "filing", month: 3, day: 1, description: "EPA Form 8700-13 A/B for LQGs", citation: "40 CFR 262.41", frequency: "biennial", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["hazwaste_gen"] },
  { id: "spcc", name: "SPCC Plan Annual Review", category: "inspection", month: 1, day: 15, description: "Review and re-certify SPCC plan", citation: "40 CFR 112.5", frequency: "annual", authority: "EPA", industries: ["manufacturing", "oil_gas", "warehousing"], jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "swdmr", name: "Stormwater DMR Submission", category: "filing", quarterlyMonths: [3, 6, 9, 12], day: 28, description: "Discharge Monitoring Report for NPDES", citation: "40 CFR 122", frequency: "quarterly", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["wastewater"] },
  { id: "psm", name: "PSM Compliance Audit", category: "inspection", month: 1, day: 1, description: "Process Safety Management audit (min every 3 yrs)", citation: "29 CFR 1910.119(o)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "oil_gas", "food_bev"], jurisdictions: ["federal"], conditions: ["psm_rmp"] },
  { id: "rmp", name: "RMP Plan Review", category: "filing", month: 6, day: 21, description: "Review Risk Management Plan", citation: "40 CFR 68", frequency: "annual", authority: "EPA", industries: ["manufacturing", "oil_gas", "food_bev"], jurisdictions: ["federal"], conditions: ["psm_rmp"] },
  { id: "hc", name: "HazCom / GHS Refresher", category: "training", month: 1, day: 15, description: "Annual Hazard Communication training", citation: "29 CFR 1910.1200(h)", frequency: "annual", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "hw8", name: "HAZWOPER 8-hr Refresher", category: "training", month: 3, day: 15, description: "Annual refresher for HAZWOPER workers", citation: "29 CFR 1910.120(e)(8)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "oil_gas", "construction"], jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "bbp", name: "Bloodborne Pathogens Training", category: "training", month: 2, day: 1, description: "Annual BBP training", citation: "29 CFR 1910.1030(g)(2)", frequency: "annual", authority: "OSHA", industries: ["healthcare", "construction"], jurisdictions: ["federal"], conditions: [] },
  { id: "fk", name: "Forklift Operator Re-Evaluation", category: "training", month: 4, day: 1, description: "PIT operator competency evaluation", citation: "29 CFR 1910.178(l)", frequency: "triennial", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: ["powered_vehicles"] },
  { id: "cs", name: "Confined Space Entry Training", category: "training", month: 5, day: 1, description: "PRCS program review and refresher", citation: "29 CFR 1910.146(g)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "oil_gas", "construction"], jurisdictions: ["federal"], conditions: ["confined_spaces"] },
  { id: "fp", name: "Fall Protection Training", category: "training", month: 2, day: 15, description: "Annual fall protection for workers >6 ft", citation: "29 CFR 1926.503", frequency: "annual", authority: "OSHA", industries: ["construction"], jurisdictions: ["federal"], conditions: ["fall_hazards"] },
  { id: "hcp", name: "Hearing Conservation Program", category: "training", month: 6, day: 1, description: "Audiometric testing + training", citation: "29 CFR 1910.95", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "construction", "oil_gas"], jurisdictions: ["federal"], conditions: ["noise_exposure"] },
  { id: "rcra", name: "RCRA Hazardous Waste Training", category: "training", month: 1, day: 31, description: "Annual training for hazwaste personnel", citation: "40 CFR 265.16", frequency: "annual", authority: "EPA", industries: "all", jurisdictions: ["federal"], conditions: ["hazwaste_gen"] },
  { id: "rad", name: "Radiation Safety Refresher", category: "training", month: 4, day: 15, description: "Dosimetry, ALARA, emergency procedures", citation: "10 CFR 19.12", frequency: "annual", authority: "NRC", industries: ["healthcare"], jurisdictions: ["federal"], conditions: ["radiation"] },
  { id: "fem", name: "Fire Extinguisher Monthly Check", category: "inspection", monthlyDay: 1, description: "Visual inspection of all extinguishers", citation: "29 CFR 1910.157(e)", frequency: "monthly", authority: "OSHA", industries: "all", jurisdictions: ["federal"], conditions: [] },
  { id: "fea", name: "Fire Extinguisher Annual Service", category: "maintenance", month: 1, day: 10, description: "Professional maintenance per NFPA 10", citation: "NFPA 10 §7.3", frequency: "annual", authority: "NFPA", industries: "all", jurisdictions: ["federal"], conditions: [] },
  { id: "ew", name: "Eyewash / Shower Weekly Test", category: "inspection", weeklyDay: "Monday", description: "Activate plumbed eyewash and showers", citation: "ANSI Z358.1", frequency: "weekly", authority: "ANSI", industries: "all", jurisdictions: ["federal"], conditions: ["hazmat_storage"] },
  { id: "cr", name: "Crane / Hoist Annual Inspection", category: "maintenance", month: 3, day: 1, description: "Annual exam of cranes and lifting devices", citation: "29 CFR 1910.179(j)", frequency: "annual", authority: "OSHA", industries: ["manufacturing", "construction", "warehousing"], jurisdictions: ["federal"], conditions: [] },
  { id: "gen", name: "Emergency Generator Monthly Test", category: "maintenance", monthlyDay: 15, description: "Monthly load test per NFPA 110", citation: "NFPA 110 §8.4", frequency: "monthly", authority: "NFPA", industries: "all", jurisdictions: ["federal"], conditions: [] },
  { id: "ldar", name: "LDAR Fugitive Emissions", category: "inspection", quarterlyMonths: [1, 4, 7, 10], day: 15, description: "Leak Detection & Repair monitoring", citation: "40 CFR 60/63", frequency: "quarterly", authority: "EPA", industries: ["manufacturing", "oil_gas"], jurisdictions: ["federal"], conditions: ["air_permits"] },
  { id: "bl", name: "Boiler / Pressure Vessel Inspection", category: "maintenance", month: 9, day: 1, description: "Annual boiler inspection", citation: "ASME / State", frequency: "annual", authority: "State", industries: ["manufacturing", "healthcare", "food_bev"], jurisdictions: ["federal"], conditions: [] },
  { id: "amm", name: "Ammonia System Quarterly Check", category: "maintenance", quarterlyMonths: [1, 4, 7, 10], day: 1, description: "Ammonia refrigeration inspection", citation: "IIAR 6", frequency: "quarterly", authority: "OSHA/IIAR", industries: ["food_bev", "warehousing"], jurisdictions: ["federal"], conditions: ["ammonia_refrig"] },
  { id: "cap65", name: "Prop 65 Warning Review", category: "reporting", month: 1, day: 31, description: "Review Proposition 65 warnings", citation: "CA HSC §25249.6", frequency: "annual", authority: "OEHHA", industries: "all", jurisdictions: ["CA"], conditions: ["hazmat_storage"] },
  { id: "cahm", name: "HMBP / CUPA Annual Filing", category: "filing", month: 3, day: 1, description: "Hazardous Materials Business Plan via CERS", citation: "CA HSC §25505", frequency: "annual", authority: "CalEPA", industries: "all", jurisdictions: ["CA"], conditions: ["hazmat_storage"] },
  { id: "caii", name: "IIPP Annual Review", category: "inspection", month: 2, day: 15, description: "Injury & Illness Prevention Program review", citation: "8 CCR §3203", frequency: "annual", authority: "Cal/OSHA", industries: "all", jurisdictions: ["CA"], conditions: [] },
  { id: "caht", name: "Heat Illness Prevention Update", category: "inspection", month: 4, day: 1, description: "Update heat illness procedures", citation: "8 CCR §3395", frequency: "annual", authority: "Cal/OSHA", industries: ["construction", "warehousing"], jurisdictions: ["CA"], conditions: [] },
  { id: "txei", name: "TCEQ Emissions Inventory", category: "filing", month: 3, day: 31, description: "Annual point source emissions inventory", citation: "30 TAC §101.10", frequency: "annual", authority: "TCEQ", industries: ["manufacturing", "oil_gas"], jurisdictions: ["TX"], conditions: ["air_permits"] },
  { id: "txt2", name: "TCEQ Tier II Filing", category: "filing", month: 3, day: 1, description: "Texas-specific Tier II with LEPC requirements", citation: "THSC §505", frequency: "annual", authority: "TCEQ", industries: "all", jurisdictions: ["TX"], conditions: ["hazmat_storage"] },
  { id: "txsw", name: "TPDES Stormwater Renewal", category: "permit", month: 8, day: 1, description: "Multi-Sector General Permit renewal", citation: "30 TAC §281", frequency: "annual", authority: "TCEQ", industries: ["manufacturing", "construction"], jurisdictions: ["TX"], conditions: ["wastewater"] },
  { id: "nyck", name: "NY Community Right-to-Know", category: "filing", month: 3, day: 1, description: "Chemical reporting under NY RTK", citation: "NY ECL §37", frequency: "annual", authority: "NY DEC", industries: "all", jurisdictions: ["NY"], conditions: ["hazmat_storage"] },
  { id: "nybk", name: "PBS / CBS Registration Renewal", category: "permit", month: 7, day: 1, description: "Petroleum/Chemical Bulk Storage renewal", citation: "6 NYCRR §613", frequency: "annual", authority: "NY DEC", industries: ["manufacturing", "oil_gas", "warehousing"], jurisdictions: ["NY"], conditions: ["hazmat_storage"] },
  { id: "njrtk", name: "NJ Worker & Community Right-to-Know Survey", category: "filing", month: 4, day: 1, description: "Annual RTK survey filing for covered hazardous substance facilities", citation: "N.J.A.C. 8:59", frequency: "annual", authority: "NJ DEP / NJ DOH", industries: "all", jurisdictions: ["NJ"], conditions: ["hazmat_storage"] },
  { id: "njdpcc", name: "NJ DPCC / DCR Plan Annual Review", category: "inspection", month: 1, day: 15, description: "Review Discharge Prevention, Containment, and Countermeasure plan and cleanup/removal plan", citation: "N.J.A.C. 7:1E", frequency: "annual", authority: "NJ DEP", industries: ["manufacturing", "oil_gas", "warehousing"], jurisdictions: ["NJ"], conditions: ["hazmat_storage"] },
  { id: "njair", name: "NJ Air Emission Statement", category: "filing", month: 3, day: 31, description: "Annual emissions statement for facilities with applicable air permits", citation: "N.J.A.C. 7:27-21", frequency: "annual", authority: "NJ DEP", industries: ["manufacturing", "oil_gas"], jurisdictions: ["NJ"], conditions: ["air_permits"] },
  { id: "njust", name: "NJ Underground Storage Tank Compliance Inspection", category: "inspection", month: 9, day: 1, description: "Annual UST compliance inspection under New Jersey UST rules", citation: "N.J.A.C. 7:14B", frequency: "annual", authority: "NJ DEP", industries: ["manufacturing", "oil_gas", "warehousing"], jurisdictions: ["NJ"], conditions: ["hazmat_storage"] },
];

export function genEvents(
  rules: LandingRule[],
  industry: string,
  jurisdictions: string[],
  flags: string[],
  emp: number
): LandingEvent[] {
  const ev: LandingEvent[] = [];
  const aJ = new Set(["federal", ...jurisdictions]);
  const aF = new Set(flags);
  for (const r of rules) {
    if (r.industries !== "all" && !r.industries.includes(industry)) continue;
    if (!r.jurisdictions.some((j: string) => aJ.has(j))) continue;
    if (r.conditions.length > 0 && !r.conditions.some((c: string) => aF.has(c))) continue;
    if (r.employeeMin && emp < r.employeeMin) continue;
    if (r.monthlyDay != null) {
      for (let m = 0; m < 12; m++) {
        ev.push({ ...r, eM: m, eD: r.monthlyDay, sk: m * 100 + r.monthlyDay });
      }
    } else if (r.weeklyDay) {
      for (let m = 0; m < 12; m++) {
        ev.push({
          ...r,
          eM: m,
          eD: null,
          sk: m * 100 + 1,
          note: `Every ${r.weeklyDay}`,
        });
      }
    } else if (r.quarterlyMonths && r.day != null) {
      for (const q of r.quarterlyMonths) {
        ev.push({ ...r, eM: q - 1, eD: r.day, sk: (q - 1) * 100 + r.day });
      }
    } else if (r.month != null && r.day != null) {
      ev.push({ ...r, eM: r.month - 1, eD: r.day, sk: (r.month - 1) * 100 + r.day });
    }
  }
  return ev.sort((a, b) => a.sk - b.sk);
}

export const VALID_INDUSTRY_IDS = [
  "manufacturing",
  "oil_gas",
  "construction",
  "healthcare",
  "warehousing",
  "food_bev",
] as const;

export const VALID_JURISDICTION_IDS = ["CA", "TX", "NY", "IL", "PA", "OH", "FL", "NJ"] as const;

export const VALID_FLAG_IDS = [
  "hazmat_storage",
  "air_permits",
  "wastewater",
  "hazwaste_gen",
  "psm_rmp",
  "confined_spaces",
  "powered_vehicles",
  "fall_hazards",
  "noise_exposure",
  "radiation",
  "ammonia_refrig",
  "lead_exposure",
] as const;
