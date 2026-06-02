import { describe, expect, it } from "vitest";
import { eventDeadlineIsoDate, eventsToReminderRows } from "../deadlineDates";
import type { LandingEvent } from "../rulesEngine";

describe("deadlineDates", () => {
  it("builds ISO date from event month/day", () => {
    const ev = { eM: 2, eD: 15, name: "Test", category: "filing" } as LandingEvent;
    expect(eventDeadlineIsoDate(ev, 2026)).toBe("2026-03-15");
  });

  it("maps events to reminder rows", () => {
    const ev = { id: "t1", eM: 0, eD: 1, name: "Annual filing", category: "filing" } as LandingEvent;
    const rows = eventsToReminderRows([ev], 2026, "User@Example.com");
    expect(rows).toHaveLength(1);
    expect(rows[0].user_email).toBe("user@example.com");
    expect(rows[0].obligation_id).toBe("t1");
  });
});
