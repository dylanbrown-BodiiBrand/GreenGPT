import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { POST as checkoutPost } from "../../billing/checkout/route";
import { POST as contactPost } from "../../contact/route";
import { POST as intakePost } from "../../intake/route";
import { POST as exportPost } from "../export/route";
import { POST as emailPost } from "../email/route";
import { GET as entitlementGet } from "../../billing/entitlement/route";
import { GET as remindersGet } from "../../reminders/send/route";

describe("route contracts", () => {
  it("returns 401 for entitlement without session", async () => {
    const res = await entitlementGet();
    expect([401, 503]).toContain(res.status);
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

  it("returns 401 for export without session", async () => {
    const req = new NextRequest("http://localhost/api/ehs-calendar/export", {
      method: "POST",
      body: JSON.stringify({ industry: "manufacturing" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await exportPost(req);
    expect([401, 503]).toContain(res.status);
  });

  it("returns 401 for reminders without cron secret", async () => {
    const req = new NextRequest("http://localhost/api/reminders/send", { method: "GET" });
    const res = await remindersGet(req);
    expect(res.status).toBe(401);
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

  it("returns 400 for contact without name", async () => {
    const req = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", message: "Hello" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await contactPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/name/i);
  });

  it("returns 400 for contact with invalid email", async () => {
    const req = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({ name: "Test", email: "bad-email", message: "Hello" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await contactPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("returns 400 for contact without message", async () => {
    const req = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({ name: "Test", email: "test@example.com" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await contactPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/message/i);
  });

  it("returns 400 for intake without company", async () => {
    const req = new NextRequest("http://localhost/api/intake", {
      method: "POST",
      body: JSON.stringify({
        contact: "Jane",
        email: "jane@example.com",
        state: "New Jersey",
        industry: "chemical_mfg",
      }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await intakePost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/company/i);
  });
});
