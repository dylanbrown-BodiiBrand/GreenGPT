-- Ask context and curated shared library (spec v1.3.0 §3.6)
-- Shared documents must carry a library category to be retrievable; uncategorized legacy documents
-- (e.g. earlier sustainability material) stay stored but never ground answers.

alter table public.documents
  add column if not exists library text
    check (library in ('regulation', 'ehs_guidance', 'template')),
  add column if not exists jurisdiction text,
  add column if not exists version_date date;

-- Backfill the GreenGPT Advisory EHS library from the ingest folders in "ehs rag docs".
update public.documents
set library = case
  when object_key like 'EHS Implementation Guideline/%' then 'ehs_guidance'
  else 'template'
end
where organization_id is null
  and library is null
  and (
    object_key like 'EHS Implementation Guideline/%'
    or object_key like 'EHS Mandatory Forms/%'
    or object_key like 'EHS Suggested Template/%'
  );

-- Intake answers (permits, hazards, chemicals, waste streams, equipment) for a provisioned facility.
alter table public.facilities
  add column if not exists intake_id uuid references public.facility_intakes(id) on delete set null;

drop function if exists public.match_chunks_scoped(vector, int, uuid, uuid);

create or replace function public.match_chunks_scoped(
  query_embedding vector,
  match_count int,
  filter_org uuid,
  filter_facility uuid default null,
  filter_state text default null
)
returns table (
  document_id uuid,
  filename text,
  organization_id uuid,
  facility_id uuid,
  approved boolean,
  library text,
  jurisdiction text,
  content text,
  page_or_sheet text,
  section_path text,
  score float8
)
language sql
stable
set search_path = public, extensions
as $$
  select
    d.id,
    d.filename::text,
    d.organization_id,
    d.facility_id,
    exists (
      select 1 from public.workspace_documents w
      where w.rag_document_id = d.id and w.approval_status = 'approved'
    ),
    d.library,
    d.jurisdiction,
    c.content::text,
    c.page_or_sheet::text,
    c.section_path::text,
    (1 - (c.embedding <=> query_embedding))::float8
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where (
      d.organization_id is null
      and d.library is not null
      and (
        d.jurisdiction is null
        or lower(d.jurisdiction) = 'federal'
        or (filter_state is not null and lower(d.jurisdiction) = lower(filter_state))
      )
    )
     or (
       filter_org is not null
       and d.organization_id = filter_org
       and (filter_facility is null or d.facility_id is null or d.facility_id = filter_facility)
       and exists (
         select 1 from public.workspace_documents w
         where w.rag_document_id = d.id and w.approval_status = 'approved'
       )
     )
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;

revoke all on function public.match_chunks_scoped(vector, int, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.match_chunks_scoped(vector, int, uuid, uuid, text) to service_role;
