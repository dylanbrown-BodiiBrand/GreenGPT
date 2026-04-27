"use client";

import {
  forwardRef,
  useEffect,
  useState,
  useMemo,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  CATEGORIES,
  RULES,
  genEvents,
  type CategoryKey,
  type LandingEvent,
} from "@/lib/ehs-calendar/rulesEngine";

// ═══════════════════════════════════════════════════════════════════════════
// THE GREEN EXECUTIVE BRIEFING — EHS COMPLIANCE CALENDAR
// Complete landing page: Hero → Live Tool → Email Gate → Pricing →
// Differentiation → Trust → Consulting CTA → FAQ
// ═══════════════════════════════════════════════════════════════════════════

// ─── BRAND ─────────────────────────────────────────────────────────────────
const B = {
  forest: "#0B3D2E", emerald: "#10B981", sage: "#6EE7B7", mint: "#D1FAE5",
  bone: "#FAFDF7", charcoal: "#1B2A22", slate: "#374944", warmGray: "#F4F2EF",
  gold: "#D4A017", coral: "#E8614D", white: "#FFFFFF",
};

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
`;

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
  CA: { label: "California", sub: "Cal/OSHA · DTSC · CARB" },
  TX: { label: "Texas", sub: "TCEQ · TWC" },
  NY: { label: "New York", sub: "DEC · DOL" },
  IL: { label: "Illinois", sub: "IEPA · IDOL" },
  PA: { label: "Pennsylvania", sub: "DEP" },
  OH: { label: "Ohio", sub: "Ohio EPA · BWC" },
  FL: { label: "Florida", sub: "DEP · OSHA" },
};

const FLAGS = {
  hazmat_storage: { label: "Hazardous materials storage (>TPQ)", icon: "☣️", free: true },
  air_permits: { label: "Air emission permits (Title V / minor)", icon: "💨", free: true },
  wastewater: { label: "Wastewater discharge (NPDES)", icon: "🌊", free: true },
  hazwaste_gen: { label: "Hazardous waste generator (RCRA)", icon: "🗑️", free: true },
  psm_rmp: { label: "PSM / RMP covered process", icon: "⚠️", free: false },
  confined_spaces: { label: "Permit-required confined spaces", icon: "🕳️", free: false },
  powered_vehicles: { label: "Forklifts / powered industrial trucks", icon: "🚜", free: false },
  fall_hazards: { label: "Fall hazards (>6 ft)", icon: "🪜", free: false },
  noise_exposure: { label: "High noise (>85 dBA)", icon: "🔊", free: false },
  radiation: { label: "Radiation sources / X-ray", icon: "☢️", free: false },
  ammonia_refrig: { label: "Ammonia refrigeration", icon: "❄️", free: false },
  lead_exposure: { label: "Lead exposure potential", icon: "🧪", free: false },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── SHARED STYLES ─────────────────────────────────────────────────────────
const serif = "'Instrument Serif', serif";
const sans = "'Outfit', sans-serif";
const mono = "'IBM Plex Mono', monospace";

function Btn({
  children,
  primary,
  onClick,
  disabled,
  style,
  small,
}: {
  children: ReactNode;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary ? B.forest : B.white,
        color: primary ? B.white : B.slate,
        border: primary ? "none" : `1.5px solid #DDD`,
        borderRadius: 10,
        padding: small ? "10px 20px" : "14px 32px",
        fontSize: small ? 13 : 15,
        fontWeight: 600,
        fontFamily: sans,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

const Section = forwardRef<
  HTMLElement,
  { children: ReactNode; id?: string; bg?: string; style?: CSSProperties }
>(function Section({ children, id, bg, style }, ref) {
  return (
    <section
      ref={ref}
      id={id}
      style={{ padding: "64px 24px", background: bg ?? "transparent", ...style }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>{children}</div>
    </section>
  );
});

Section.displayName = "Section";

const ProBadge = () => (
  <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600,
    background: `linear-gradient(135deg, ${B.gold}, #E8B931)`,
    color: B.charcoal, padding: "2px 7px", borderRadius: 4,
    letterSpacing: 1, textTransform: "uppercase", marginLeft: 6,
  }}>PRO</span>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function EHSCalendarLanding() {
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [step, setStep] = useState(-1);
  const [industry, setIndustry] = useState<string | null>(null);
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [flags, setFlags] = useState<string[]>([]);
  const [employees, setEmployees] = useState(50);
  const [calView, setCalView] = useState("grid");
  const [filterCat, setFilterCat] = useState<CategoryKey | null>(null);
  const [email, setEmail] = useState("");
  const [entitlementStatus, setEntitlementStatus] = useState<"none" | "active" | "past_due" | "trialing" | "canceled">("none");
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [entitlementLoading, setEntitlementLoading] = useState(false);
  const [saveEmailLoading, setSaveEmailLoading] = useState(false);
  const [saveEmailError, setSaveEmailError] = useState<string | null>(null);
  const [saveEmailDone, setSaveEmailDone] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const toolRef = useRef<HTMLElement | null>(null);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactNotice, setContactNotice] = useState<null | { type: "ok" | "err"; text: string }>(null);

  const events = useMemo(() => {
    if (!industry) return [];
    let e = genEvents(RULES, industry, jurisdictions, flags, employees);
    if (filterCat) e = e.filter((ev) => ev.category === filterCat);
    return e;
  }, [industry, jurisdictions, flags, employees, filterCat]);

  const startTool = () => {
    setStep(0);
    setTimeout(() => toolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const refreshEntitlement = async (targetEmail: string) => {
    const normalized = targetEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return;

    try {
      setEntitlementLoading(true);
      const res = await fetch(`/api/billing/entitlement?email=${encodeURIComponent(normalized)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load subscription status.");
      setTier(data?.tier === "pro" ? "pro" : "free");
      setEntitlementStatus(data?.status || "none");
    } catch {
      setTier("free");
      setEntitlementStatus("none");
    } finally {
      setEntitlementLoading(false);
    }
  };

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    const timer = setTimeout(() => {
      void refreshEntitlement(normalized);
    }, 400);
    return () => clearTimeout(timer);
  }, [email]);

  const handleUpgrade = async () => {
    setBillingError(null);
    const typed = email.trim().toLowerCase();
    const fallback = window.prompt("Enter your billing email:", typed);
    const checkoutEmail = (fallback ?? typed).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutEmail)) {
      setBillingError("A valid billing email is required to start checkout.");
      return;
    }

    try {
      setBillingLoading(true);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: checkoutEmail }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || "Unable to start checkout.");
      window.location.href = data.url;
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Unable to start checkout.");
    } finally {
      setBillingLoading(false);
      setShowUpgrade(false);
    }
  };

  const tryLockedFeature = () => setShowUpgrade(true);

  const sendCalendarEmail = async () => {
    setSaveEmailError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSaveEmailError("Please enter a valid email.");
      return;
    }
    if (!industry) {
      setSaveEmailError("Generate your calendar first, then save.");
      return;
    }
    try {
      setSaveEmailLoading(true);
      const res = await fetch("/api/ehs-calendar/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          industry,
          jurisdictions,
          flags,
          employees,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send calendar.");
      setSaveEmailDone(true);
      await refreshEntitlement(trimmed);
    } catch (err) {
      setSaveEmailError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaveEmailLoading(false);
    }
  };

  const exportCalendar = async () => {
    setBillingError(null);
    if (!industry) {
      setBillingError("Generate your calendar before exporting.");
      return;
    }
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setBillingError("Enter your subscription email to export .ics.");
      return;
    }

    try {
      setExportLoading(true);
      const res = await fetch("/api/ehs-calendar/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalized,
          industry,
          jurisdictions,
          flags,
          employees,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Export failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ehs-compliance-calendar-${new Date().getFullYear()}.ics`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExportLoading(false);
    }
  };

  const onSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactNotice(null);

    try {
      setContactLoading(true);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          company: contactCompany,
          phone: contactPhone,
          message: contactMessage,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to send message.");

      setContactNotice({ type: "ok", text: "Thanks — we received your message." });
      setContactName("");
      setContactEmail("");
      setContactCompany("");
      setContactPhone("");
      setContactMessage("");
    } catch (err) {
      setContactNotice({
        type: "err",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div style={{ background: B.bone, fontFamily: sans }}>
      <style>{fonts}</style>

      {/* ═══ UPGRADE MODAL ═══ */}
      {showUpgrade && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(11,61,46,0.55)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }} onClick={() => setShowUpgrade(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: B.white, borderRadius: 20, padding: "40px 36px", maxWidth: 460,
            boxShadow: "0 24px 64px rgba(0,0,0,0.2)", animation: "fadeUp 0.3s ease both",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔓</div>
            <h3 style={{ fontFamily: serif, fontSize: 26, color: B.forest, margin: "0 0 8px" }}>
              Unlock full compliance coverage
            </h3>
            <p style={{ fontSize: 14, color: "#666", fontWeight: 300, lineHeight: 1.6, margin: "0 0 20px" }}>
              Pro includes 7 state jurisdictions, all 12 facility flags, .ics calendar export, email reminders at 30/60/90 days, and CFR citation links.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <Btn primary onClick={handleUpgrade} disabled={billingLoading} style={{ flex: 1, background: B.forest }}>
                {billingLoading ? "Redirecting..." : "Start Pro — $49/mo"}
              </Btn>
              <Btn onClick={() => setShowUpgrade(false)}>Maybe later</Btn>
            </div>
            {billingError && (
              <p style={{ marginTop: 12, fontSize: 13, color: B.coral, fontWeight: 500 }}>{billingError}</p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — HERO                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: B.forest, color: B.white, padding: "80px 24px 72px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -100, right: -100, width: 300, height: 300, borderRadius: "50%", background: "rgba(16,185,129,0.1)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(110,231,183,0.06)" }} />
        <div style={{ position: "absolute", top: 40, left: "50%", width: 150, height: 150, borderRadius: "50%", background: "rgba(212,160,23,0.05)" }} />

        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: B.emerald, marginBottom: 16 }}>
            The Green Executive Briefing
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 44, fontWeight: 400, margin: "0 0 16px", lineHeight: 1.1 }}>
            Know every EHS deadline<br />
            <span style={{ fontStyle: "italic", color: B.sage }}>before it finds you</span>
          </h1>
          <p style={{ fontSize: 17, fontWeight: 300, opacity: 0.7, lineHeight: 1.6, margin: "0 auto 32px", maxWidth: 540 }}>
            Select your industry, jurisdiction, and facility hazards. Our regulatory rules engine generates a personalized compliance calendar — instantly, for free.
          </p>
          <button type="button" onClick={startTool} style={{
            background: B.emerald, color: B.charcoal, border: "none", borderRadius: 12,
            padding: "16px 40px", fontSize: 16, fontWeight: 700, fontFamily: sans,
            cursor: "pointer", boxShadow: `0 4px 20px rgba(16,185,129,0.35)`,
            transition: "transform 0.2s ease",
          }}>
            Generate my calendar — free
          </button>
          <div style={{ marginTop: 16, fontSize: 13, opacity: 0.4 }}>No signup required. See results in 60 seconds.</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — THE LIVE TOOL                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="tool" ref={toolRef} bg={B.bone}>
          {step >= 0 && (
            <div style={{ animation: "fadeUp 0.4s ease both" }}>

              {/* Step indicator */}
              {step < 3 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: i < step ? B.forest : i === step ? B.emerald : B.warmGray,
                        color: i <= step ? B.white : B.slate,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: mono, fontSize: 13, fontWeight: 600,
                        transition: "all 0.3s ease",
                        boxShadow: i === step ? `0 0 0 4px ${B.mint}` : "none",
                      }}>{i + 1}</div>
                      {i < 2 && <div style={{ width: 32, height: 2, background: i < step ? B.forest : "#E5E7EB" }} />}
                    </div>
                  ))}
                  <div style={{ marginLeft: "auto", fontFamily: mono, fontSize: 11, color: B.slate }}>
                    Step {step + 1} of 3
                  </div>
                </div>
              )}

              {/* ──── STEP 0: INDUSTRY ──── */}
              {step === 0 && (
                <div>
                  <h2 style={{ fontFamily: serif, fontSize: 26, color: B.forest, margin: "0 0 6px" }}>Select your industry</h2>
                  <p style={{ fontSize: 14, color: "#888", fontWeight: 300, margin: "0 0 24px" }}>This determines which OSHA standards, EPA programs, and sector-specific rules apply.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
                    {Object.entries(INDUSTRIES).map(([id, d], i) => {
                      const on = industry === id;
                      return (
                        <button type="button" key={id} onClick={() => setIndustry(id)} style={{
                          background: on ? B.forest : B.white, color: on ? B.white : B.charcoal,
                          border: `2px solid ${on ? B.forest : "#E8ECE9"}`, borderRadius: 14,
                          padding: "22px 18px", cursor: "pointer", textAlign: "left",
                          transition: "all 0.2s ease", transform: on ? "scale(1.02)" : "scale(1)",
                          boxShadow: on ? "0 6px 20px rgba(11,61,46,0.2)" : "none",
                          animation: `fadeUp 0.35s ease ${i * 0.05}s both`,
                        }}>
                          <div style={{ fontSize: 28, marginBottom: 6 }}>{d.icon}</div>
                          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{d.label}</div>
                          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 300 }}>{d.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                  <Btn primary disabled={!industry} onClick={() => setStep(1)}>Continue →</Btn>
                </div>
              )}

              {/* ──── STEP 1: JURISDICTION + EMPLOYEES ──── */}
              {step === 1 && (
                <div>
                  <h2 style={{ fontFamily: serif, fontSize: 26, color: B.forest, margin: "0 0 6px" }}>Jurisdiction & workforce</h2>
                  <p style={{ fontSize: 14, color: "#888", fontWeight: 300, margin: "0 0 24px" }}>
                    Federal rules are always included. State programs add additional obligations.
                    {tier === "free" && <span style={{ color: B.gold, fontWeight: 500 }}> State rules require Pro.</span>}
                  </p>
                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#999", marginBottom: 12 }}>
                    State jurisdictions {tier === "free" && <ProBadge />}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 28 }}>
                    {Object.entries(JURISDICTIONS).map(([k, v]) => {
                      const locked = tier === "free";
                      const on = jurisdictions.includes(k);
                      return (
                        <div key={k} style={{ position: "relative" }}>
                          {locked && (
                            <div style={{
                              position: "absolute", inset: 0, background: "rgba(11,61,46,0.04)",
                              borderRadius: 10, zIndex: 2, cursor: "not-allowed",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              backdropFilter: "blur(1px)",
                            }}>
                              <div style={{ background: B.white, borderRadius: 6, padding: "4px 12px", fontFamily: mono, fontSize: 10, fontWeight: 600, color: B.forest, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>🔒 Pro</div>
                            </div>
                          )}
                          <button type="button" onClick={() => locked ? tryLockedFeature() : setJurisdictions(p => p.includes(k) ? p.filter(x=>x!==k) : [...p,k])} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", width: "100%",
                            background: on ? B.mint : B.white, border: `1.5px solid ${on ? B.emerald : "#E8ECE9"}`,
                            borderRadius: 10, cursor: "pointer", textAlign: "left",
                          }}>
                            <span style={{ fontSize: 16 }}>📍</span>
                            <span style={{ fontFamily: sans, fontSize: 13, fontWeight: on ? 500 : 300, color: B.charcoal, flex: 1 }}>{v.label} — <span style={{ fontSize: 11, color: "#999" }}>{v.sub}</span></span>
                            <span style={{
                              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${on ? B.emerald : "#CCC"}`,
                              background: on ? B.emerald : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: B.white, fontSize: 11, fontWeight: 700,
                            }}>{on ? "✓" : ""}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#999", display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    Employee count <span style={{ fontFamily: mono, fontSize: 18, color: B.emerald, fontWeight: 700 }}>{employees}</span>
                  </div>
                  <input type="range" min={1} max={500} value={employees} onChange={e => setEmployees(+e.target.value)} style={{ width: "100%", accentColor: B.emerald, marginBottom: 28 }} />

                  <div style={{ display: "flex", gap: 12 }}>
                    <Btn onClick={() => setStep(0)}>← Back</Btn>
                    <Btn primary onClick={() => setStep(2)}>Continue →</Btn>
                  </div>
                </div>
              )}

              {/* ──── STEP 2: FACILITY FLAGS ──── */}
              {step === 2 && (
                <div>
                  <h2 style={{ fontFamily: serif, fontSize: 26, color: B.forest, margin: "0 0 6px" }}>Facility hazard profile</h2>
                  <p style={{ fontSize: 14, color: "#888", fontWeight: 300, margin: "0 0 24px" }}>Each flag activates specific regulatory obligations. Free tier includes 4 core flags.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 28 }}>
                    {Object.entries(FLAGS).map(([k, d]) => {
                      const locked = !d.free && tier === "free";
                      const on = flags.includes(k);
                      return (
                        <div key={k} style={{ position: "relative" }}>
                          {locked && (
                            <div style={{
                              position: "absolute", inset: 0, background: "rgba(11,61,46,0.04)",
                              borderRadius: 10, zIndex: 2, cursor: "not-allowed",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              backdropFilter: "blur(1px)",
                            }}>
                              <div style={{ background: B.white, borderRadius: 6, padding: "4px 12px", fontFamily: mono, fontSize: 10, fontWeight: 600, color: B.forest, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>🔒 Pro</div>
                            </div>
                          )}
                          <button type="button" onClick={() => locked ? tryLockedFeature() : setFlags(p => p.includes(k) ? p.filter(x=>x!==k) : [...p,k])} style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", width: "100%",
                            background: on ? B.mint : B.white, border: `1.5px solid ${on ? B.emerald : "#E8ECE9"}`,
                            borderRadius: 10, cursor: locked ? "not-allowed" : "pointer", textAlign: "left",
                          }}>
                            <span style={{ fontSize: 16 }}>{d.icon}</span>
                            <span style={{ fontFamily: sans, fontSize: 12.5, fontWeight: on ? 500 : 300, color: B.charcoal, flex: 1 }}>
                              {d.label} {locked && <ProBadge />}
                            </span>
                            <span style={{
                              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                              border: `2px solid ${on ? B.emerald : "#CCC"}`,
                              background: on ? B.emerald : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: B.white, fontSize: 11, fontWeight: 700,
                            }}>{on ? "✓" : ""}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <Btn onClick={() => setStep(1)}>← Back</Btn>
                    <button onClick={() => setStep(3)} style={{
                      background: B.emerald, color: B.charcoal, border: "none", borderRadius: 10,
                      padding: "14px 32px", fontSize: 15, fontWeight: 700, fontFamily: sans,
                      cursor: "pointer", boxShadow: `0 4px 16px rgba(16,185,129,0.3)`,
                    }}>Generate calendar →</button>
                  </div>
                </div>
              )}

              {/* ──── STEP 3: RESULTS ──── */}
              {step === 3 && (
                <div style={{ animation: "fadeUp 0.4s ease both" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h2 style={{ fontFamily: serif, fontSize: 28, margin: "0 0 4px", color: B.forest }}>Your compliance calendar</h2>
                      <p style={{ fontSize: 13, color: "#888", fontWeight: 300, margin: 0 }}>
                        <strong style={{ color: B.emerald, fontWeight: 700 }}>{events.length}</strong> obligations ·{" "}
                        {industry ? INDUSTRIES[industry as keyof typeof INDUSTRIES]?.label : "—"} ·{" "}
                        {jurisdictions.length > 0 ? `Federal + ${jurisdictions.join(", ")}` : "Federal only"} · {employees}{" "}
                        employees
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Btn small onClick={() => setStep(0)}>← Reconfigure</Btn>
                      {tier !== "free" && (
                        <Btn
                          small
                          primary
                          onClick={exportCalendar}
                          disabled={exportLoading}
                          style={{ background: B.forest }}
                        >
                          {exportLoading ? "Exporting..." : "📅 Export .ics"}
                        </Btn>
                      )}
                      <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #E0E0E0" }}>
                        {[["grid","Grid"],["timeline","Timeline"]].map(([v,l]) => (
                          <button type="button" key={v} onClick={() => setCalView(v)} style={{
                            background: calView === v ? B.forest : B.white,
                            color: calView === v ? B.white : "#888",
                            border: "none", padding: "8px 14px", fontSize: 12,
                            fontWeight: 600, cursor: "pointer", fontFamily: sans,
                          }}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Category pills */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setFilterCat(null)} style={{
                      background: !filterCat ? B.forest : B.white, color: !filterCat ? B.white : "#888",
                      border: `1.5px solid ${!filterCat ? B.forest : "#E0E0E0"}`, borderRadius: 20,
                      padding: "6px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: sans,
                    }}>All ({events.length})</button>
                    {Object.entries(CATEGORIES).map(([k, c]) => (
                      <button key={k} type="button" onClick={() => setFilterCat(filterCat === k ? null : (k as CategoryKey))} style={{
                        background: filterCat === k ? c.color : B.white,
                        color: filterCat === k ? B.white : c.color,
                        border: `1.5px solid ${filterCat === k ? c.color : "#E0E0E0"}`,
                        borderRadius: 20, padding: "6px 12px", fontSize: 11,
                        fontWeight: 600, cursor: "pointer", fontFamily: sans,
                      }}>{c.icon} {c.label}</button>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 24 }}>
                    {Object.entries(CATEGORIES).map(([k, c]) => {
                      const count = events.filter((e) => e.category === (k as CategoryKey)).length;
                      return (
                        <div key={k} style={{ background: B.white, borderRadius: 12, padding: "14px 8px", border: "1.5px solid #EEF0ED", textAlign: "center" }}>
                          <div style={{ fontSize: 18, marginBottom: 2 }}>{c.icon}</div>
                          <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: c.color }}>{count}</div>
                          <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{c.label}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Calendar grid */}
                  {calView === "grid" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                      {Array.from({ length: 12 }, (_, i) => {
                        const me = events.filter(e => e.eM === i);
                        return (
                          <div key={i} style={{
                            background: B.white, borderRadius: 14, padding: "16px 14px",
                            border: `1.5px solid ${me.length > 3 ? B.sage : "#EEF0ED"}`,
                            minHeight: 140,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                              <span style={{ fontFamily: serif, fontSize: 18, color: B.forest }}>{MONTHS[i]}</span>
                              {me.length > 0 && <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, background: B.forest, color: B.white, padding: "2px 8px", borderRadius: 10 }}>{me.length}</span>}
                            </div>
                            {me.length === 0 && <div style={{ fontSize: 12, color: "#CCC", fontStyle: "italic" }}>No deadlines</div>}
                            {me.slice(0, 5).map((e, j) => (
                              <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "3px 0", borderBottom: j < Math.min(me.length, 5) - 1 ? `1px solid ${B.warmGray}` : "none" }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: CATEGORIES[e.category as CategoryKey]?.color }} />
                                <div style={{ fontSize: 11, color: B.slate, lineHeight: 1.3, fontWeight: 300 }}>
                                  {e.eD && <span style={{ fontFamily: mono, fontWeight: 600, marginRight: 4, color: B.forest, fontSize: 10 }}>{e.eD}</span>}
                                  {e.name}
                                </div>
                              </div>
                            ))}
                            {me.length > 5 && <div style={{ fontFamily: mono, fontSize: 10, color: "#AAA", marginTop: 4 }}>+{me.length - 5} more</div>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Timeline view */
                    <div style={{ position: "relative", paddingLeft: 28 }}>
                      <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: B.sage }} />
                      {Object.entries(
                        events.reduce<Record<number, LandingEvent[]>>((acc, e) => {
                          if (!acc[e.eM]) acc[e.eM] = [];
                          acc[e.eM].push(e);
                          return acc;
                        }, {})
                      )
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .map(([mo, evts], idx) => (
                          <div key={mo} style={{ marginBottom: 24, position: "relative", animation: `slideIn 0.3s ease ${idx * 0.05}s both` }}>
                            <div style={{ position: "absolute", left: -24, top: 4, width: 12, height: 12, borderRadius: "50%", background: B.forest, border: `3px solid ${B.mint}` }} />
                            <div style={{ fontFamily: serif, fontSize: 20, color: B.forest, marginBottom: 10 }}>{MONTH_FULL[parseInt(mo)]}</div>
                            {evts.map((e, i) => (
                              <div key={i} style={{
                                display: "flex", gap: 12, background: B.white, borderRadius: 12,
                                padding: "12px 16px", border: "1.5px solid #EEF0ED", marginBottom: 6,
                              }}>
                                <div style={{ minWidth: 36, textAlign: "center", fontFamily: mono, fontSize: 13, fontWeight: 600, color: CATEGORIES[e.category as CategoryKey]?.color, background: `${CATEGORIES[e.category as CategoryKey]?.color}12`, padding: "2px 6px", borderRadius: 6 }}>{e.eD || "~"}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: B.charcoal, marginBottom: 2 }}>{e.name}</div>
                                  <div style={{ fontSize: 11, color: "#777", fontWeight: 300, lineHeight: 1.4 }}>{e.description}</div>
                                  <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                                    <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", background: `${CATEGORIES[e.category as CategoryKey]?.color}15`, color: CATEGORIES[e.category as CategoryKey]?.color }}>{CATEGORIES[e.category as CategoryKey]?.label}</span>
                                    <span style={{ fontFamily: mono, fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "#F3F4F6", color: "#666" }}>{e.authority}</span>
                                    {e.citation && <span style={{ fontFamily: mono, fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "#F3F4F6", color: "#999" }}>{e.citation}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pre-tool state */}
          {step === -1 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <h2 style={{ fontFamily: serif, fontSize: 24, color: B.forest, margin: "0 0 8px" }}>Ready to map your obligations?</h2>
              <p style={{ fontSize: 14, color: "#999", fontWeight: 300, margin: "0 0 24px" }}>
                Click &quot;Generate my calendar&quot; above to start the 3-step setup.
              </p>
            </div>
          )}
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — EMAIL CAPTURE (shows after results)                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {step === 3 && !saveEmailDone && (
        <Section bg={B.mint}>
          <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
            <h3 style={{ fontFamily: serif, fontSize: 24, color: B.forest, margin: "0 0 8px" }}>
              Email your compliance calendar
            </h3>
            <p style={{ fontSize: 14, color: "#666", fontWeight: 300, margin: "0 0 24px", lineHeight: 1.6 }}>
              We will send a personalized <strong>.ics</strong> file to your inbox so you can import deadlines into Outlook, Google Calendar, or Apple Calendar.
            </p>
            <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  const normalized = email.trim().toLowerCase();
                  if (normalized) void refreshEntitlement(normalized);
                }}
                disabled={saveEmailLoading}
                style={{
                  flex: "1 1 200px",
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: `1.5px solid ${B.sage}`,
                  fontSize: 15,
                  fontFamily: sans,
                  outline: "none",
                  background: B.white,
                }}
              />
              <button
                type="button"
                onClick={sendCalendarEmail}
                disabled={saveEmailLoading}
                style={{
                  background: B.forest,
                  color: B.white,
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 24px",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: sans,
                  cursor: saveEmailLoading ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  opacity: saveEmailLoading ? 0.7 : 1,
                }}
              >
                {saveEmailLoading ? "Sending…" : "Email my calendar"}
              </button>
            </div>
            {saveEmailError && (
              <p style={{ marginTop: 14, fontSize: 13, color: B.coral, fontWeight: 500 }}>{saveEmailError}</p>
            )}
            {tier === "pro" && (
              <p style={{ marginTop: 8, fontSize: 12, color: B.forest, fontWeight: 500 }}>
                Pro access confirmed{entitlementStatus !== "none" ? ` (${entitlementStatus})` : ""}.
              </p>
            )}
            {entitlementLoading && (
              <p style={{ marginTop: 8, fontSize: 12, color: "#666", fontWeight: 400 }}>
                Checking subscription status...
              </p>
            )}
            {billingError && (
              <p style={{ marginTop: 8, fontSize: 13, color: B.coral, fontWeight: 500 }}>{billingError}</p>
            )}
          </div>
        </Section>
      )}
      {step === 3 && saveEmailDone && (
        <Section bg={B.mint}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <p style={{ fontFamily: sans, fontSize: 15, color: B.forest, fontWeight: 500 }}>
              Sent! Check your inbox for <strong>{email.trim()}</strong> — your calendar file is attached.
            </p>
          </div>
        </Section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4 — PRICING                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="pricing" bg={B.white}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontFamily: serif, fontSize: 32, color: B.forest, margin: "0 0 8px" }}>Simple, transparent pricing</h2>
          <p style={{ fontSize: 15, color: "#888", fontWeight: 300 }}>Start free. Upgrade when you need state-level coverage.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, maxWidth: 820, margin: "0 auto" }}>
          {[
            { tier: "Free", price: "$0", sub: "forever", features: ["Federal rules only", "4 facility hazard flags", "Grid + timeline views", "Category filtering"], cta: "Current plan", disabled: true, bg: B.bone },
            { tier: "Pro", price: "$49", sub: "/month", features: ["7 state jurisdictions", "All 12 facility flags", ".ics calendar export", "Email reminders (30/60/90 days)", "CFR citation links", "Document attachment"], cta: "Upgrade to Pro", featured: true, bg: B.white },
            { tier: "Enterprise", price: "$149", sub: "/month", features: ["Everything in Pro", "Multi-facility dashboard", "Team member access", "Custom rule engine", "Priority support", "Quarterly compliance review call"], cta: "Contact us", bg: B.bone },
          ].map((p, i) => {
            const ctaStyle: CSSProperties = {
              marginTop: 20,
              width: "100%",
              padding: "13px 20px",
              borderRadius: 10,
              background: p.featured ? B.forest : "transparent",
              color: p.featured ? B.white : B.slate,
              border: p.featured ? "none" : `1.5px solid #DDD`,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: sans,
              cursor: p.disabled || (p.featured && billingLoading) ? "default" : "pointer",
              opacity: p.disabled || (p.featured && billingLoading) ? 0.5 : 1,
              textAlign: "center",
              textDecoration: "none",
              display: "block",
              boxSizing: "border-box",
            };
            return (
            <div key={i} style={{
              background: p.bg, borderRadius: 16, padding: "32px 28px",
              border: p.featured ? `2px solid ${B.emerald}` : "1.5px solid #EEF0ED",
              position: "relative", display: "flex", flexDirection: "column",
            }}>
              {p.featured && (
                <div style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: B.emerald, color: B.charcoal, fontFamily: mono, fontSize: 10,
                  fontWeight: 600, padding: "4px 14px", borderRadius: 20, letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}>Most popular</div>
              )}
              <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: B.slate, marginBottom: 8 }}>{p.tier}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 20 }}>
                <span style={{ fontFamily: serif, fontSize: 40, color: B.forest }}>{p.price}</span>
                <span style={{ fontSize: 14, color: "#999", fontWeight: 300 }}>{p.sub}</span>
              </div>
              <div style={{ flex: 1 }}>
                {p.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ color: B.emerald, fontSize: 14, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 13, color: B.slate, fontWeight: 300 }}>{f}</span>
                  </div>
                ))}
              </div>
              {i === 2 ? (
                <Link href="/contact" style={ctaStyle}>
                  {p.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={p.featured ? handleUpgrade : undefined}
                  disabled={p.disabled || (p.featured && billingLoading)}
                  style={ctaStyle}
                >
                  {p.featured && billingLoading ? "Redirecting..." : p.cta}
                </button>
              )}
            </div>
            );
          })}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5 — DIFFERENTIATION                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section bg={B.bone}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontFamily: serif, fontSize: 28, color: B.forest, margin: "0 0 8px" }}>Why this — not ChatGPT</h2>
          <p style={{ fontSize: 14, color: "#888", fontWeight: 300 }}>A chatbot gives you a paragraph. This gives you an auditable compliance program.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            { icon: "📖", title: "CFR citations per obligation", desc: "Every deadline maps to a specific regulation — 29 CFR 1910.119, 40 CFR 372 — not an AI's best guess." },
            { icon: "🏛️", title: "Jurisdiction hierarchy", desc: "Federal baseline + state overlays. California IIPP, Texas TCEQ emissions, New York bulk storage — properly layered." },
            { icon: "⚡", title: "Conditional trigger logic", desc: "Rules activate based on your facility profile — PSM coverage, noise exposure, hazwaste generation. Irrelevant rules stay hidden." },
          ].map((c, i) => (
            <div key={i} style={{
              background: B.white, borderRadius: 14, padding: "28px 24px",
              border: "1.5px solid #EEF0ED",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 15, color: B.forest, marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: "#777", fontWeight: 300, lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6 — TRUST                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section bg={B.white}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: B.emerald, marginBottom: 8 }}>Trusted by EHS professionals</div>
          <h2 style={{ fontFamily: serif, fontSize: 28, color: B.forest, margin: "0 0 24px" }}>Built by compliance consultants, for compliance teams</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, maxWidth: 700, margin: "0 auto" }}>
          {[
            { quote: "We were tracking deadlines on a spreadsheet with 200 rows. This replaced it in 10 minutes and caught three obligations we'd missed entirely.", name: "EHS Director", co: "Chemical manufacturer, TX" },
            { quote: "The jurisdiction layering is what sold us. Our California facilities have completely different obligations than our Ohio plants — this handles both.", name: "VP of Operations", co: "Food & beverage processor, multi-state" },
          ].map((t, i) => (
            <div key={i} style={{
              background: B.bone, borderRadius: 14, padding: "28px 24px",
              border: "1.5px solid #EEF0ED",
            }}>
              <div style={{ fontSize: 14, color: B.slate, fontWeight: 300, lineHeight: 1.6, fontStyle: "italic", marginBottom: 16 }}>
                &ldquo;{t.quote}&rdquo;
              </div>
              <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 13, color: B.forest }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "#999" }}>{t.co}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 7 — CONSULTING CTA                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section bg={B.forest} style={{ color: B.white }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40, maxWidth: 760, margin: "0 auto", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: B.emerald, marginBottom: 8 }}>Beyond software</div>
            <h2 style={{ fontFamily: serif, fontSize: 30, margin: "0 0 12px", color: B.white, fontWeight: 400 }}>Need help closing compliance gaps?</h2>
            <p style={{ fontSize: 14, fontWeight: 300, opacity: 0.7, lineHeight: 1.7, margin: "0 0 24px" }}>
              Our EHS consultants audit your program against this calendar, build SOPs for each obligation, train your team, and prepare you for ISO 14001 certification.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {["Gap assessments", "SOP development", "ISO 14001 prep", "Training programs"].map(s => (
                <span key={s} style={{ fontFamily: mono, fontSize: 11, padding: "4px 12px", borderRadius: 6, background: "rgba(16,185,129,0.15)", color: B.sage }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <a href="https://cal.com/the-green-executive-briefing" target="_blank" rel="noopener noreferrer" style={{
              display: "inline-block", background: B.emerald, color: B.charcoal,
              borderRadius: 12, padding: "16px 36px", fontSize: 16, fontWeight: 700,
              fontFamily: sans, textDecoration: "none",
              boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
            }}>Book a free consultation</a>
            <div style={{ fontSize: 12, opacity: 0.4, marginTop: 10 }}>30-minute call · No commitment</div>
          </div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 8 — FAQ                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section bg={B.bone}>
        <h2 style={{ fontFamily: serif, fontSize: 28, color: B.forest, margin: "0 0 32px", textAlign: "center" }}>Frequently asked questions</h2>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {[
            { q: "How often is the regulatory database updated?", a: "We review federal and state regulatory updates monthly. When OSHA, EPA, or state agencies publish new rules, amendments, or deadline changes, we update the rules engine and notify all Pro/Enterprise users via email." },
            { q: "Can I export deadlines to Outlook or Google Calendar?", a: "Pro and Enterprise users can export all obligations as an .ics file, which imports directly into Outlook, Google Calendar, or Apple Calendar. Each obligation becomes a calendar event with the description, citation, and frequency." },
            { q: "How is this different from just asking ChatGPT about EHS deadlines?", a: "A chatbot generates text based on probability — it can hallucinate deadlines, miss state-specific rules, and can't filter by your facility profile. Our tool uses a coded rules engine where every obligation has a specific CFR citation, trigger conditions, and jurisdiction hierarchy. It's deterministic, auditable, and filterable." },
            { q: "What happens if I cancel my Pro subscription?", a: "You keep access through the end of your billing period. After that, your calendar reverts to the free tier (federal rules only). Your saved configuration isn't deleted — if you resubscribe, everything comes back." },
            { q: "Can I use this for multiple facilities?", a: "The Enterprise plan supports multiple facility profiles, each with its own industry, jurisdiction, and hazard configuration. You get a rollup dashboard showing compliance status across all sites." },
            { q: "Do you offer consulting beyond the software?", a: "Yes — The Green Executive Briefing provides full EHS consulting: compliance gap assessments, SOP development, ISO 14001 implementation, and team training. The calendar tool is designed to identify gaps; our consulting team helps close them." },
          ].map((faq, i) => (
            <div key={i} style={{
              marginBottom: 8, borderRadius: 12, overflow: "hidden",
              border: "1.5px solid #EEF0ED", background: B.white,
            }}>
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                width: "100%", padding: "18px 20px", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                background: "transparent", border: "none", cursor: "pointer",
                textAlign: "left",
              }}>
                <span style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: B.charcoal }}>{faq.q}</span>
                <span style={{ fontSize: 18, color: B.emerald, fontWeight: 300, flexShrink: 0, marginLeft: 12, transition: "transform 0.2s ease", transform: openFaq === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 20px 18px", fontSize: 13, color: "#666", fontWeight: 300, lineHeight: 1.7 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 9 — CONTACT                                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Section id="contact" bg={B.white}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: serif, fontSize: 28, color: B.forest, margin: "0 0 8px" }}>Contact</h2>
          <p style={{ fontSize: 14, color: "#888", fontWeight: 300, margin: 0 }}>
            Tell us what you need — we&apos;ll follow up by email.
          </p>
        </div>

        <form onSubmit={onSubmitContact} style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 8 }}>
                Name
              </label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                autoComplete="name"
                disabled={contactLoading}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #E8ECE9",
                  fontSize: 14,
                  fontFamily: sans,
                  outline: "none",
                  background: B.white,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={contactLoading}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #E8ECE9",
                  fontSize: 14,
                  fontFamily: sans,
                  outline: "none",
                  background: B.white,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 8 }}>
                Phone (optional)
              </label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                autoComplete="tel"
                disabled={contactLoading}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #E8ECE9",
                  fontSize: 14,
                  fontFamily: sans,
                  outline: "none",
                  background: B.white,
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 8 }}>
                Company (optional)
              </label>
              <input
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                autoComplete="organization"
                disabled={contactLoading}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #E8ECE9",
                  fontSize: 14,
                  fontFamily: sans,
                  outline: "none",
                  background: B.white,
                }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "#999", marginBottom: 8 }}>
                Message
              </label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                required
                rows={5}
                disabled={contactLoading}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #E8ECE9",
                  fontSize: 14,
                  fontFamily: sans,
                  outline: "none",
                  background: B.white,
                  resize: "vertical",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button
              type="submit"
              disabled={contactLoading}
              style={{
                background: B.forest,
                color: B.white,
                border: "none",
                borderRadius: 10,
                padding: "12px 22px",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: sans,
                cursor: contactLoading ? "default" : "pointer",
                opacity: contactLoading ? 0.65 : 1,
              }}
            >
              {contactLoading ? "Sending..." : "Send message"}
            </button>
          </div>

          {contactNotice && (
            <p
              style={{
                marginTop: 12,
                textAlign: "center",
                fontSize: 13,
                fontWeight: 500,
                color: contactNotice.type === "ok" ? B.forest : B.coral,
              }}
            >
              {contactNotice.text}
            </p>
          )}
        </form>
      </Section>

      {/* ─── FOOTER CTA ─── */}
      <div style={{ background: B.charcoal, color: B.white, padding: "48px 24px", textAlign: "center" }}>
        <h3 style={{ fontFamily: serif, fontSize: 26, margin: "0 0 12px", fontWeight: 400 }}>Stop tracking compliance on spreadsheets</h3>
        <p style={{ fontSize: 14, fontWeight: 300, opacity: 0.5, margin: "0 0 24px" }}>Generate your personalized EHS calendar in 60 seconds.</p>
        <button type="button" onClick={() => { setStep(0); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{
          background: B.emerald, color: B.charcoal, border: "none", borderRadius: 12,
          padding: "14px 36px", fontSize: 15, fontWeight: 700, fontFamily: sans, cursor: "pointer",
        }}>Get started — free</button>
      </div>
    </div>
  );
}
