export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { makeLogger, errorResponse } from "@/utils/debug";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  const { rid, dlog } = makeLogger("register-file");
  try {
    const body = await req.text();
    dlog("request", "raw body", body);
    let parsed: any;
    try { parsed = JSON.parse(body || "{}"); } catch (e:any) {
      return errorResponse(400, rid, "parse.body", "BAD_JSON", e?.message || "Invalid JSON");
    }
    const { objectKey } = parsed;
    if (!objectKey) return errorResponse(400, rid, "validate", "MISSING_OBJECT_KEY", "objectKey required");

    dlog("sign", "Create signed URL (hashing)", { objectKey });
    const { data: signed, error: signErr } = await supabase.storage.from("rag-source").createSignedUrl(objectKey, 120);
    if (signErr || !signed?.signedUrl) return errorResponse(500, rid, "sign", "SIGNED_URL_FAILED", signErr?.message || "no signed URL");

    const res = await fetch(signed.signedUrl);
    const bytes = Buffer.from(await res.arrayBuffer()).toString("base64"); // base64 to avoid binary logs
    if (!res.ok) return errorResponse(502, rid, "fetch.bytes", "FETCH_FAILED", `status ${res.status}`);
    if (!bytes.length) return errorResponse(502, rid, "fetch.bytes", "EMPTY_BYTES", "0 bytes");
    const content_hash = crypto.createHash("sha256").update(bytes, "base64").digest("hex");
    dlog("hash", "content hash", { content_hash: content_hash.slice(0, 16) + "…" });

    const filename = objectKey.split("/").pop() || objectKey;
    const file_type = (filename.split(".").pop() || "").toLowerCase();
    const { data: pub } = supabase.storage.from("rag-source").getPublicUrl(objectKey);
    const source_url = pub.publicUrl;

    dlog("db.upsert.try", "Find existing", { filename, objectKey });
    const { data: existing, error: selErr } = await supabase
      .from("documents").select("id, content_hash").eq("filename", filename).eq("object_key", objectKey).maybeSingle();
    if (selErr) return errorResponse(500, rid, "db.select", "SELECT_FAILED", selErr.message);

    let documentId: string;
    if (!existing) {
      dlog("db.insert", "Insert new document row");
      const { data, error } = await supabase.from("documents").insert({
        title: filename.replace(/\.[^.]+$/, ""),
        filename, file_type, source_url, object_key: objectKey, content_hash,
        status: "pending", metadata: {}
      }).select("id").single();
      if (error) return errorResponse(500, rid, "db.insert", "INSERT_FAILED", error.message);
      documentId = data!.id;
    } else {
      documentId = existing.id;
      if (existing.content_hash !== content_hash) {
        dlog("db.update", "Content changed → set pending");
        const { error } = await supabase.from("documents").update({ content_hash, status: "pending" }).eq("id", documentId);
        if (error) return errorResponse(500, rid, "db.update", "UPDATE_FAILED", error.message);
      } else {
        dlog("db.update", "Content unchanged");
      }
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || "";
    dlog("index.call", "POST /api/index-now", { base, documentId });
    const idxRes = await fetch(`${base}/api/index-now`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId })
    });

    const text = await idxRes.text();
    dlog("index.res", "index-now response", { status: idxRes.status, body: text.slice(0, 800) });

    let indexResult: any;
    try { indexResult = JSON.parse(text); } catch (e:any) {
      return errorResponse(500, rid, "index.parse", "INDEX_JSON_ERROR", e?.message || "invalid JSON from index-now");
    }

    return new NextResponse(JSON.stringify({ ok: true, rid, documentId, indexResult }, null, 2), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e: any) {
    return errorResponse(500, rid, "unhandled", "UNCAUGHT", e?.message || String(e));
  }
}
