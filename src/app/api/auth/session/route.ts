export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/requireSessionUser";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ signedIn: false, email: null });
  }
  return NextResponse.json({ signedIn: true, email: user.email });
}
