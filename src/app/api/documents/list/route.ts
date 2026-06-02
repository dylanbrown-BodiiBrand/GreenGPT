export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireProEmail } from "@/lib/billing/entitlementServer";
import { isValidEmail } from "@/lib/ehs-calendar/profile";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const BUCKET = "obligation-files";

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Storage is not configured.", requestId }, { status: 503 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  const obligationId = req.nextUrl.searchParams.get("obligationId")?.trim() ?? "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email is required.", requestId }, { status: 400 });
  }
  if (!obligationId) {
    return NextResponse.json({ error: "obligationId is required.", requestId }, { status: 400 });
  }

  try {
    await requireProEmail(supabase, email);

    const { data: docs, error } = await supabase
      .from("obligation_documents")
      .select("id,file_name,file_path,uploaded_at")
      .eq("user_email", email)
      .eq("obligation_id", obligationId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, requestId }, { status: 500 });
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
    const status =
      err instanceof Error && "statusCode" in err && (err as Error & { statusCode: number }).statusCode === 403
        ? 403
        : 400;
    return NextResponse.json({ error: message, requestId }, { status });
  }
}
