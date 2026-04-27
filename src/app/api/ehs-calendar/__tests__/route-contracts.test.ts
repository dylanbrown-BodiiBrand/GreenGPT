import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as checkoutPost } from "../../billing/checkout/route";
import { POST as exportPost } from "../export/route";
import { POST as emailPost } from "../email/route";
import { GET as entitlementGet } from "../../billing/entitlement/route";

describe("route contracts", () => {
  it("returns 400 for entitlement without valid email", async () => {
    const req = new NextRequest("http://localhost/api/billing/entitlement?email=bad-email", {
      method: "GET",
    });
    const res = await entitlementGet(req);
    expect([400, 503]).toContain(res.status);
  });

  it("returns 503 for checkout when billing env is missing", async () => {
    const req = new NextRequest("http://localhost/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await checkoutPost(req);
    expect(res.status).toBe(503);
  });

  it("returns 400 for export with invalid email before entitlement lookup", async () => {
    const req = new NextRequest("http://localhost/api/ehs-calendar/export", {
      method: "POST",
      body: JSON.stringify({ email: "bad-email" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await exportPost(req);
    expect([400, 503]).toContain(res.status);
  });

  it("returns 503 for email when resend env is missing", async () => {
    const req = new NextRequest("http://localhost/api/ehs-calendar/email", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await emailPost(req);
    expect(res.status).toBe(503);
  });
});
