export type TenantDocument = {
  id: string;
  organization_id?: string | null;
  facility_id?: string | null;
  /** Client documents are retrievable only when linked to an approved workspace document. */
  approved?: boolean | null;
  /** Shared documents are retrievable only with a library category (regulation, ehs_guidance, template). */
  library?: string | null;
  /** Shared documents: null, "federal", or a state name matching facilities.state. */
  jurisdiction?: string | null;
};

export type ChunkHit = {
  document_id: string;
  content?: string;
  score?: number;
};

/**
 * Row re-check after the scoped search (spec §3.6). Keep categorized, in-jurisdiction shared documents
 * plus the requester's own approved client documents; drop other facilities when one is selected.
 */
export function filterChunksForTenant<T extends ChunkHit>(
  hits: T[],
  docs: TenantDocument[],
  scope: { organizationId: string | null; facilityId: string | null; state?: string | null }
): T[] {
  const byId = new Map(docs.map((d) => [d.id, d]));
  return hits.filter((hit) => {
    const meta = byId.get(hit.document_id);
    if (!meta) return false;
    if (!meta.organization_id) {
      if (!meta.library) return false;
      const j = meta.jurisdiction?.trim().toLowerCase();
      return !j || j === "federal" || (!!scope.state && j === scope.state.trim().toLowerCase());
    }
    if (!scope.organizationId || meta.organization_id !== scope.organizationId) return false;
    if (scope.facilityId && meta.facility_id && meta.facility_id !== scope.facilityId) return false;
    return meta.approved === true;
  });
}
