"use client";

import type { BriefingItemStatus, MonthlyBriefingData } from "@/lib/managed-compliance/sampleBriefing";
import {
  MANAGED_BRAND as B,
  managedFonts,
  managedMono as mono,
  managedSans as sans,
  managedSerif as serif,
} from "@/lib/managed-compliance/brand";

function StatusBadge({ status }: { status: BriefingItemStatus }) {
  const config: Record<BriefingItemStatus, { bg: string; color: string; label: string }> = {
    action_needed: { bg: "#FEF3C7", color: "#92400E", label: "Action needed" },
    on_track: { bg: B.mint, color: B.forest, label: "On track" },
    scheduled: { bg: "#DBEAFE", color: "#1E40AF", label: "Scheduled" },
    overdue: { bg: "#FEE2E2", color: "#991B1B", label: "Overdue" },
    completed: { bg: B.mint, color: B.forest, label: "Completed" },
  };
  const c = config[status] ?? config.on_track;
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 20,
        background: c.bg,
        color: c.color,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {c.label}
    </span>
  );
}

function ScoreRing({ score, prev }: { score: number; prev: number }) {
  const delta = score - prev;
  const color = score >= 90 ? B.green : score >= 70 ? B.amber : B.coral;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto" }}>
        <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r="52" fill="none" stroke="#E5E7EB" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${score * 3.27} ${327 - score * 3.27}`}
            strokeDashoffset="82"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: mono, fontSize: 32, fontWeight: 700, color: B.charcoal, lineHeight: 1 }}>
            {score}%
          </div>
        </div>
      </div>
      <div style={{ fontFamily: sans, fontSize: 12, color: delta > 0 ? B.green : B.coral, fontWeight: 600, marginTop: 8 }}>
        {delta > 0 ? "↑" : "↓"} {Math.abs(delta)} pts from last month
      </div>
    </div>
  );
}

function CategoryBar({ label, compliant, total }: { label: string; compliant: number; total: number }) {
  const pct = Math.round((compliant / total) * 100);
  const color = pct >= 90 ? B.green : pct >= 70 ? B.amber : B.coral;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <div style={{ width: 160, fontFamily: sans, fontSize: 13, color: B.slate, fontWeight: 300 }}>{label}</div>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#E5E7EB", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color }} />
      </div>
      <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color, minWidth: 60, textAlign: "right" }}>
        {compliant}/{total}
      </div>
    </div>
  );
}

export default function MonthlyComplianceBriefing({ data }: { data: MonthlyBriefingData }) {
  const d = data;
  const actionItems = d.upcoming.filter((u) => u.status === "action_needed");
  const onTrackItems = d.upcoming.filter((u) => u.status !== "action_needed");

  return (
    <div style={{ background: B.bone, minHeight: "100vh" }}>
      <style>{managedFonts}</style>

      <div style={{ background: B.forest, color: B.white, padding: "36px 24px" }}>
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
            GreenGPT Advisory
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 28, margin: "0 0 4px", fontWeight: 400 }}>Monthly compliance briefing</h1>
          <div style={{ fontFamily: sans, fontSize: 14, opacity: 0.6, fontWeight: 300 }}>
            {d.company} · {d.month}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ background: B.white, borderRadius: 16, padding: 28, marginBottom: 24, border: "1.5px solid #EEF0ED" }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: B.emerald,
              marginBottom: 16,
            }}
          >
            Executive summary
          </div>
          <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
            <ScoreRing score={d.score} prev={d.prevScore} />
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontFamily: sans, fontSize: 14, color: B.slate, lineHeight: 1.7, marginBottom: 16 }}>
                <strong style={{ fontWeight: 600, color: B.charcoal }}>{d.contact}</strong> — your facility&apos;s overall
                compliance score improved {d.score - d.prevScore} points to{" "}
                <strong style={{ fontWeight: 600, color: B.charcoal }}>{d.score}%</strong> this month.{" "}
                {actionItems.length} items need your review before their due dates.
                {d.overdue.length > 0 && ` ${d.overdue.length} item is overdue — see details below.`}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ textAlign: "center", padding: 12, borderRadius: 10, background: B.bone }}>
                  <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: B.emerald }}>{d.upcoming.length}</div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: "#999" }}>Due this month</div>
                </div>
                <div style={{ textAlign: "center", padding: 12, borderRadius: 10, background: B.bone }}>
                  <div style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, color: B.amber }}>{actionItems.length}</div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: "#999" }}>Need your review</div>
                </div>
                <div style={{ textAlign: "center", padding: 12, borderRadius: 10, background: B.bone }}>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 20,
                      fontWeight: 700,
                      color: d.overdue.length > 0 ? B.coral : B.green,
                    }}
                  >
                    {d.overdue.length}
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: "#999" }}>Overdue</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: B.white, borderRadius: 16, padding: 28, marginBottom: 24, border: "1.5px solid #EEF0ED" }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: B.slate,
              marginBottom: 16,
            }}
          >
            Compliance by category
          </div>
          {Object.values(d.categories).map((cat) => (
            <CategoryBar key={cat.label} label={cat.label} compliant={cat.compliant} total={cat.total} />
          ))}
        </div>

        {actionItems.length > 0 && (
          <div style={{ background: B.white, borderRadius: 16, padding: 28, marginBottom: 24, border: `2px solid ${B.gold}` }}>
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: B.gold,
                marginBottom: 4,
              }}
            >
              Requires your review
            </div>
            <div style={{ fontFamily: sans, fontSize: 13, color: "#999", marginBottom: 20 }}>
              These items need your input before we can proceed. Reply to this email with approvals or edits.
            </div>
            {actionItems.map((item) => (
              <div
                key={item.name}
                style={{
                  padding: "18px 20px",
                  borderRadius: 12,
                  marginBottom: 10,
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
                  <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 14, color: B.charcoal }}>{item.name}</div>
                  <StatusBadge status={item.status} />
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: mono, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#FEF3C7", color: "#92400E" }}>
                    Due {item.due}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#F3F4F6", color: "#666" }}>
                    {item.authority}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#F3F4F6", color: "#999" }}>
                    {item.citation}
                  </span>
                </div>
                <div style={{ fontFamily: sans, fontSize: 13, color: B.slate, lineHeight: 1.6, fontWeight: 300 }}>{item.notes}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: B.white, borderRadius: 16, padding: 28, marginBottom: 24, border: "1.5px solid #EEF0ED" }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: B.emerald,
              marginBottom: 16,
            }}
          >
            On track — no action needed
          </div>
          {onTrackItems.map((item, i) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom: i < onTrackItems.length - 1 ? "1px solid #F3F4F6" : "none",
              }}
            >
              <div>
                <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: B.charcoal }}>{item.name}</div>
                <div style={{ fontFamily: mono, fontSize: 11, color: "#999" }}>
                  Due {item.due} · {item.citation}
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>

        {d.overdue.length > 0 && (
          <div style={{ background: B.white, borderRadius: 16, padding: 28, marginBottom: 24, border: `2px solid ${B.coral}` }}>
            <div
              style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: B.coral,
                marginBottom: 16,
              }}
            >
              Overdue items
            </div>
            {d.overdue.map((item) => (
              <div key={item.name} style={{ padding: "14px 18px", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8 }}>
                  <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 14, color: B.charcoal }}>{item.name}</div>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: B.coral }}>{item.daysLate} days overdue</span>
                </div>
                <div style={{ fontFamily: sans, fontSize: 13, color: B.slate, lineHeight: 1.6, fontWeight: 300 }}>{item.notes}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background: B.white, borderRadius: 16, padding: 28, marginBottom: 24, border: "1.5px solid #EEF0ED" }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: B.slate,
              marginBottom: 16,
            }}
          >
            Completed last month
          </div>
          {d.completed_last_month.map((item, i) => (
            <div
              key={item.name}
              style={{
                padding: "12px 0",
                borderBottom: i < d.completed_last_month.length - 1 ? "1px solid #F3F4F6" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ color: B.green, fontSize: 14 }}>✓</span>
                <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: B.charcoal }}>{item.name}</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: "#999" }}>{item.completed}</span>
              </div>
              <div style={{ fontFamily: sans, fontSize: 12, color: "#888", fontWeight: 300, marginLeft: 22 }}>{item.notes}</div>
            </div>
          ))}
        </div>

        <div style={{ background: B.white, borderRadius: 16, padding: 28, marginBottom: 24, border: "1.5px solid #EEF0ED" }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: B.blue,
              marginBottom: 16,
            }}
          >
            Regulatory changes this month
          </div>
          {d.reg_changes.map((change) => (
            <div
              key={change.title}
              style={{
                padding: "18px 20px",
                borderRadius: 12,
                marginBottom: 10,
                background: change.applies ? "#EFF6FF" : B.bone,
                border: `1px solid ${change.applies ? "#BFDBFE" : "#EEF0ED"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                <div style={{ fontFamily: sans, fontWeight: 600, fontSize: 14, color: B.charcoal }}>{change.title}</div>
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    flexShrink: 0,
                    background: change.applies ? "#DBEAFE" : "#F3F4F6",
                    color: change.applies ? "#1E40AF" : "#999",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {change.applies ? "Applies to you" : "Monitoring"}
                </span>
              </div>
              <div style={{ fontFamily: sans, fontSize: 13, color: B.slate, lineHeight: 1.6, fontWeight: 300, marginBottom: 8 }}>
                {change.impact}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 13,
                  color: B.forest,
                  fontWeight: 500,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: B.mint,
                }}
              >
                Our action: {change.action}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: B.forest, borderRadius: 16, padding: 28, color: B.white, textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 20, marginBottom: 8, fontWeight: 400 }}>Questions about this briefing?</div>
          <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 300, opacity: 0.7, marginBottom: 20 }}>
            Reply directly to this email or book a call to discuss any items.
          </div>
          <a
            href="https://cal.com/the-green-executive-briefing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: B.emerald,
              color: B.charcoal,
              borderRadius: 10,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: sans,
              textDecoration: "none",
            }}
          >
            Book a review call
          </a>
          <div style={{ fontFamily: mono, fontSize: 10, opacity: 0.3, marginTop: 16 }}>
            GreenGPT Advisory · greengptadvisory.com
          </div>
        </div>
      </div>
    </div>
  );
}
