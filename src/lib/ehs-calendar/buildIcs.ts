import type { LandingEvent } from "./rulesEngine";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function escapeIcsText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** YYYYMMDD for all-day DTSTART */
function toDateValue(year: number, monthIndex0: number, day: number): string {
  return `${year}${pad2(monthIndex0 + 1)}${pad2(day)}`;
}

/** DTEND is exclusive (next calendar day) for all-day events */
function addOneCalendarDay(ymd: string): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(4, 6)) - 1;
  const d = Number(ymd.slice(6, 8));
  const dt = new Date(Date.UTC(y, m, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}`;
}

function firstWeekdayOfMonth(year: number, monthIndex0: number, weekdayName: string): number {
  const idx = WEEKDAYS.indexOf(weekdayName as (typeof WEEKDAYS)[number]);
  if (idx < 0) return 1;
  const d = new Date(year, monthIndex0, 1);
  while (d.getDay() !== idx) {
    d.setDate(d.getDate() + 1);
  }
  return d.getDate();
}

function foldLine(line: string, maxLen = 75): string {
  if (line.length <= maxLen) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > maxLen) {
    parts.push(rest.slice(0, maxLen));
    rest = ` ${rest.slice(maxLen)}`;
  }
  if (rest.length) parts.push(rest);
  return parts.join("\r\n ");
}

function eventUid(ev: LandingEvent, year: number): string {
  const base = ev.id || ev.name.replace(/\s+/g, "-").slice(0, 40);
  return `ehs-${base}-${year}-${ev.eM}-${ev.eD ?? "w"}-${ev.sk}@greengptadvisory.com`;
}

function buildDescription(ev: LandingEvent): string {
  const bits = [
    ev.description,
    ev.citation && `Citation: ${ev.citation}`,
    ev.frequency && `Frequency: ${ev.frequency}`,
    ev.authority && `Authority: ${ev.authority}`,
    ev.note,
  ].filter(Boolean) as string[];
  return bits.join("\n\n");
}

/**
 * Build an iCalendar document for the given year (calendar grid months 0–11 map to that year).
 */
export function buildEhsCalendarIcs(events: LandingEvent[], year: number): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Green Executive Briefing//EHS Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:EHS Compliance Calendar",
  ];

  const dtstamp = (() => {
    const n = new Date();
    return `${n.getUTCFullYear()}${pad2(n.getUTCMonth() + 1)}${pad2(n.getUTCDate())}T${pad2(n.getUTCHours())}${pad2(n.getUTCMinutes())}${pad2(n.getUTCSeconds())}Z`;
  })();

  for (const ev of events) {
    let start: string | null = null;
    if (ev.eD != null) {
      start = toDateValue(year, ev.eM, ev.eD);
    } else if (ev.weeklyDay) {
      const dom = firstWeekdayOfMonth(year, ev.eM, ev.weeklyDay);
      start = toDateValue(year, ev.eM, dom);
    }
    if (!start) continue;

    const end = addOneCalendarDay(start);
    const summary = escapeIcsText(ev.name);
    const desc = escapeIcsText(buildDescription(ev));

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${eventUid(ev, year)}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
    lines.push(foldLine(`SUMMARY:${summary}`));
    if (desc) lines.push(foldLine(`DESCRIPTION:${desc}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
