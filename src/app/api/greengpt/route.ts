// src/app/api/greengpt/route.ts
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireSessionUser } from "@/lib/auth/requireSessionUser";

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { question } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: question,
      }),
    });

    const data = await response.json();
    const answerText = data?.output?.[0]?.content?.[0]?.text || "No answer returned";

    return NextResponse.json({ answer: answerText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch from OpenAI";
    return NextResponse.json({ error: message }, { status: httpStatusFromError(err, 500) });
  }
}
