// src/app/api/greengpt/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { question } = await req.json();

  if (!question) {
    return NextResponse.json({ error: "No question provided" }, { status: 400 });
  }

  try {
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
    console.log(data);
    const answerText =
  data?.output?.[0]?.content?.[0]?.text || "No answer returned";

return NextResponse.json({ answer: answerText });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch from OpenAI" }, { status: 500 });
  }
}
