import { describe, expect, it } from "vitest";
import { hasProAccess, isEnterpriseTier } from "../tier";

describe("billing tier helpers", () => {
  it("hasProAccess for pro and enterprise", () => {
    expect(hasProAccess("pro")).toBe(true);
    expect(hasProAccess("enterprise")).toBe(true);
    expect(hasProAccess("free")).toBe(false);
    expect(hasProAccess(null)).toBe(false);
  });

  it("isEnterpriseTier only for enterprise", () => {
    expect(isEnterpriseTier("enterprise")).toBe(true);
    expect(isEnterpriseTier("pro")).toBe(false);
  });
});
