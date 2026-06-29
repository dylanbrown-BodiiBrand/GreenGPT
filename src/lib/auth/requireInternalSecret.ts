import type { NextRequest } from "next/server";
import { HttpError } from "./httpError";

export function assertInternalSecret(req: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    throw new HttpError(401, "Unauthorized.");
  }
}

export function internalSecretHeaders(): Record<string, string> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return {};
  return { Authorization: `Bearer ${secret}` };
}
