import type { LandingEvent } from "./rulesEngine";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function firstWeekdayOfMonth(year: number, monthIndex0: number, weekdayName: string): number {
  const idx = WEEKDAYS.indexOf(weekdayName as (typeof WEEKDAYS)[number]);
  if (idx < 0) return 1;
  const d = new Date(year, monthIndex0, 1);
  while (d.getDay() !== idx) d.setDate(d.getDate() + 1);
  return d.getDate();
}

/** ISO date YYYY-MM-DD for an event in the given calendar year */
export function eventDeadlineIsoDate(ev: LandingEvent, year: number): string | null {
  let day: number | null = null;
  if (ev.eD != null) {
    day = ev.eD;
  } else if (ev.weeklyDay) {
    day = firstWeekdayOfMonth(year, ev.eM, ev.weeklyDay);
  }
  if (day == null) return null;
  const m = String(ev.eM + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export type DeadlineReminderRow = {
  user_email: string;
  obligation_id: string;
  obligation_name: string;
  deadline_date: string;
};

export function eventsToReminderRows(
  events: LandingEvent[],
  year: number,
  userEmail: string
): DeadlineReminderRow[] {
  const email = userEmail.trim().toLowerCase();
  const rows: DeadlineReminderRow[] = [];
  for (const ev of events) {
    const deadline_date = eventDeadlineIsoDate(ev, year);
    if (!deadline_date) continue;
    const obligation_id = ev.id ?? `${ev.name}-${ev.eM}-${deadline_date}`;
    rows.push({
      user_email: email,
      obligation_id,
      obligation_name: ev.name,
      deadline_date,
    });
  }
  return rows;
}
