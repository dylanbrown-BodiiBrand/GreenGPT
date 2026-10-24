-- Retrieval tenancy (spec v1.2.0 §3.6, ICA-17)
-- Shared library = documents.organization_id is null. Client documents need an organization tag
-- and an approved workspace_documents link before they can ground an answer.

alter table public.workspace_documents
  add column if not exists rag_document_id uuid references public.documents(id) on delete set null;

create unique index if not exists workspace_documents_rag_document_idx
  on public.workspace_documents (rag_document_id)
  where rag_document_id is not null;

create or replace function public.match_chunks_scoped(
  query_embedding vector,
  match_count int,
  filter_org uuid,
  filter_facility uuid default null
)
returns table (
  document_id uuid,
  filename text,
  organization_id uuid,
  facility_id uuid,
  approved boolean,
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
    c.content::text,
    c.page_or_sheet::text,
    c.section_path::text,
    (1 - (c.embedding <=> query_embedding))::float8
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where d.organization_id is null
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

-- Server-only: callers could otherwise pass any filter_org.
revoke all on function public.match_chunks_scoped(vector, int, uuid, uuid) from public, anon, authenticated;
grant execute on function public.match_chunks_scoped(vector, int, uuid, uuid) to service_role;

-- The unscoped legacy search is no longer called by the app; keep it from browser roles.
do $$
declare fn regprocedure;
begin
  for fn in select p.oid::regprocedure from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'match_chunks'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
  end loop;
end $$;
