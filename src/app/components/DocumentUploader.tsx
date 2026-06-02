"use client";

import { useCallback, useEffect, useState } from "react";

type Doc = { id: string; fileName: string; uploadedAt: string; url: string | null };

export default function DocumentUploader({
  email,
  obligationId,
  obligationName,
  disabled,
}: {
  email: string;
  obligationId: string;
  obligationName: string;
  disabled?: boolean;
}) {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !obligationId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/documents/list?email=${encodeURIComponent(normalized)}&obligationId=${encodeURIComponent(obligationId)}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load documents.");
      setDocuments(data.documents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [email, obligationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpload = async (file: File | null) => {
    if (!file || disabled) return;
    const normalized = email.trim().toLowerCase();
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("email", normalized);
      form.set("obligationId", obligationId);
      form.set("file", file);
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (disabled) return null;

  return (
    <div
      style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "#F8FAF9", border: "1px solid #E5EBE8" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: "#374944", marginBottom: 6 }}>
        Documents — {obligationName}
      </div>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, cursor: uploading ? "wait" : "pointer" }}>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          style={{ display: "none" }}
          disabled={uploading}
          onChange={(e) => {
            void onUpload(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <span style={{ padding: "4px 8px", borderRadius: 6, background: "#0B3D2E", color: "#fff", fontWeight: 600 }}>
          {uploading ? "Uploading…" : "Attach file"}
        </span>
      </label>
      {loading && <div style={{ fontSize: 10, color: "#888", marginTop: 6 }}>Loading…</div>}
      {error && <div style={{ fontSize: 10, color: "#E8614D", marginTop: 6 }}>{error}</div>}
      {documents.length > 0 && (
        <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
          {documents.map((d) => (
            <li key={d.id} style={{ fontSize: 10, marginBottom: 4 }}>
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ color: "#0B3D2E" }}>
                  {d.fileName}
                </a>
              ) : (
                d.fileName
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
