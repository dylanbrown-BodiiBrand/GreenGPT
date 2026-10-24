import type { SupabaseClient } from "@supabase/supabase-js";

export type ClientDocumentTag = {
  documentId: string;
  organizationId: string;
  facilityId: string | null;
  title: string;
  fileType: string;
  objectKey: string;
  /** Operator confirms the client approved (or redacted) this document for the workspace. */
  approved: boolean;
};

/**
 * Tag an indexed document to one client and link it to the workspace library (spec §3.6).
 * Untagged documents stay in the shared library. Approval is never downgraded here.
 */
export async function tagClientDocument(supabase: SupabaseClient, tag: ClientDocumentTag): Promise<void> {
  if (tag.facilityId) {
    const { data: facility, error } = await supabase
      .from("facilities")
      .select("organization_id")
      .eq("id", tag.facilityId)
      .maybeSingle();
    if (error || !facility) throw new Error("Facility not found.");
    if (facility.organization_id !== tag.organizationId) {
      throw new Error("Facility does not belong to this organization.");
    }
  }

  const { error: tagErr } = await supabase
    .from("documents")
    .update({ organization_id: tag.organizationId, facility_id: tag.facilityId })
    .eq("id", tag.documentId);
  if (tagErr) throw new Error(`Unable to tag document: ${tagErr.message}`);

  const { data: link, error: linkErr } = await supabase
    .from("workspace_documents")
    .select("id, approval_status")
    .eq("rag_document_id", tag.documentId)
    .maybeSingle();
  if (linkErr) throw new Error(`Unable to read workspace document: ${linkErr.message}`);

  if (!link) {
    const { error } = await supabase.from("workspace_documents").insert({
      organization_id: tag.organizationId,
      facility_id: tag.facilityId,
      title: tag.title,
      doc_type: tag.fileType || null,
      approval_status: tag.approved ? "approved" : "draft",
      source_uri: tag.objectKey,
      rag_document_id: tag.documentId,
      notes: tag.approved
        ? "Client-approved at ingestion."
        : "Indexed; must be approved before it can ground answers.",
    });
    if (error) throw new Error(`Unable to link workspace document: ${error.message}`);
    return;
  }

  const { error } = await supabase
    .from("workspace_documents")
    .update({
      organization_id: tag.organizationId,
      facility_id: tag.facilityId,
      ...(tag.approved && link.approval_status !== "approved" ? { approval_status: "approved" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", link.id);
  if (error) throw new Error(`Unable to update workspace document: ${error.message}`);
}
