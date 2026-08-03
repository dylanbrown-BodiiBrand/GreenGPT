import { describe, expect, it } from "vitest";
import { INSUFFICIENT_SOURCES_MESSAGE, isCorrectiveActionStatus, isReviewState } from "../types";

describe("workspace types", () => {
  it("accepts review states", () => {
    expect(isReviewState("draft")).toBe(true);
    expect(isReviewState("approved")).toBe(true);
    expect(isReviewState("final")).toBe(false);
  });

  it("accepts corrective action statuses", () => {
    expect(isCorrectiveActionStatus("awaiting_evidence")).toBe(true);
    expect(isCorrectiveActionStatus("done")).toBe(false);
  });

  it("exposes insufficient-sources message", () => {
    expect(INSUFFICIENT_SOURCES_MESSAGE).toMatch(/approved documents/i);
  });
});
