export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireProSession } from "@/lib/auth/requireProSession";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "obligation-files";

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Storage is not configured (SUPABASE_SERVICE_ROLE_KEY).", requestId },
      { status: 503 }
    );
  }

  try {
    const { user } = await requireProSession();
    const form = await req.formData();
    const obligationId = String(form.get("obligationId") ?? "").trim();
    const file = form.get("file");

    if (!obligationId) {
      return NextResponse.json({ error: "obligationId is required.", requestId }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required.", requestId }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be 10 MB or smaller.", requestId }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${user.email}/${obligationId}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadErr) {
      return NextResponse.json({ error: "Upload failed.", requestId }, { status: 500 });
    }

    const { data: row, error: dbErr } = await supabase
      .from("obligation_documents")
      .insert({
        user_email: user.email,
        obligation_id: obligationId,
        file_path: filePath,
        file_name: file.name,
      })
      .select("id,file_name,uploaded_at")
      .single();

    if (dbErr) {
      return NextResponse.json({ error: "Unable to save document record.", requestId }, { status: 500 });
    }

    return NextResponse.json({ ok: true, document: row, requestId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message, requestId }, { status: httpStatusFromError(err, 400) });
  }
}
