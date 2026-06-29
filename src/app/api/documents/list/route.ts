export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { httpStatusFromError } from "@/lib/auth/httpError";
import { requireProSession } from "@/lib/auth/requireProSession";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const BUCKET = "obligation-files";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Storage is not configured.", requestId }, { status: 503 });
  }

  const obligationId = req.nextUrl.searchParams.get("obligationId")?.trim() ?? "";
  if (!obligationId) {
    return NextResponse.json({ error: "obligationId is required.", requestId }, { status: 400 });
  }

  try {
    const { user } = await requireProSession();

    const { data: docs, error } = await supabase
      .from("obligation_documents")
      .select("id,file_name,file_path,uploaded_at")
      .eq("user_email", user.email)
      .eq("obligation_id", obligationId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Unable to list documents.", requestId }, { status: 500 });
    }

    const withUrls = await Promise.all(
      (docs ?? []).map(async (doc) => {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(doc.file_path, 3600);
        return {
          id: doc.id,
          fileName: doc.file_name,
          uploadedAt: doc.uploaded_at,
          url: signed?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ documents: withUrls, requestId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "List failed.";
    return NextResponse.json({ error: message, requestId }, { status: httpStatusFromError(err, 400) });
  }
}
