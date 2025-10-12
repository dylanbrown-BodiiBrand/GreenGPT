import { randomUUID } from "crypto";

const ON = process.env.DEBUG_RAG === "1";

export type DLog = (stage: string, msg: string, extra?: unknown) => void;

export function makeLogger(prefix: string, rid?: string): { rid: string; dlog: DLog } {
  const id = rid || randomUUID();
  const dlog: DLog = (stage, msg, extra) => {
    if (!ON) return;
    try {
      // Redact obvious sensitive fields
      const scrub = (v: unknown) => {
        if (!v) return v;
        const s = JSON.stringify(v, (_k, val) => {
          if (typeof val === "string") {
            if (val.toLowerCase().includes("authorization")) return "[redacted]";
            if (val.includes("Bearer ")) return "[redacted]";
            if (val.startsWith("http") && val.includes("token=")) return "[signed-url-redacted]";
          }
          return val;
        });
        // clip giant blobs
        return s.length > 1200 ? s.slice(0, 1200) + "…[trimmed]" : s;
      };
      console.error(`[RAG][${prefix}][${id}][${stage}] ${msg}${extra ? " :: " + scrub(extra) : ""}`);
    } catch {
      // ignore logging failures
    }
  };
  return { rid: id, dlog };
}

export function errorResponse(status: number, rid: string, stage: string, code: string, message: string, details?: unknown) {
  return new Response(JSON.stringify({ ok: false, rid, stage, code, message, details }, null, 2), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
