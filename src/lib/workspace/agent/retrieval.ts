export type TenantDocument = {
  id: string;
  organization_id?: string | null;
  facility_id?: string | null;
};

export type ChunkHit = {
  document_id: string;
  content?: string;
  score?: number;
};

/**
 * Keep shared advisory corpus (null organization_id) plus the requesting tenant.
 * Drop another organization's documents. When a facility is set, drop other-facility client docs.
 */
export function filterChunksForTenant<T extends ChunkHit>(
  hits: T[],
  docs: TenantDocument[],
  scope: { organizationId: string; facilityId: string | null }
): T[] {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return hits.filter((hit) => {
    const meta = byId.get(hit.document_id);
    if (!meta) return false;
    if (meta.organization_id && meta.organization_id !== scope.organizationId) return false;
    if (scope.facilityId && meta.facility_id && meta.facility_id !== scope.facilityId) return false;
    return true;
  });
}
