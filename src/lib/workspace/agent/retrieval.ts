export type TenantDocument = {
  id: string;
  organization_id?: string | null;
  facility_id?: string | null;
  /** Client documents are retrievable only when linked to an approved workspace document. */
  approved?: boolean | null;
};

export type ChunkHit = {
  document_id: string;
  content?: string;
  score?: number;
};

/**
 * Row re-check after the scoped search (spec §3.6). Keep the shared library (null organization_id)
 * plus the requester's own approved client documents; drop other facilities when one is selected.
 */
export function filterChunksForTenant<T extends ChunkHit>(
  hits: T[],
  docs: TenantDocument[],
  scope: { organizationId: string | null; facilityId: string | null }
): T[] {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return hits.filter((hit) => {
    const meta = byId.get(hit.document_id);
    if (!meta) return false;
    if (!meta.organization_id) return true;
    if (!scope.organizationId || meta.organization_id !== scope.organizationId) return false;
    if (scope.facilityId && meta.facility_id && meta.facility_id !== scope.facilityId) return false;
    return meta.approved === true;
  });
}
