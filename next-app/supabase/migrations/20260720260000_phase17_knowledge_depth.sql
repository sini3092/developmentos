-- DevelopmentOS Phase 17: Knowledge depth (TipTap, versions, lore relationships)

create type public.knowledge_content_format as enum (
  'markdown',
  'tiptap'
);

create type public.lore_relationship_type as enum (
  'related_to',
  'parent_of',
  'member_of',
  'located_in',
  'ally_of',
  'enemy_of'
);

alter table public.design_documents
  add column content_json jsonb,
  add column content_format public.knowledge_content_format not null default 'markdown';

alter table public.lore_entries
  add column content_json jsonb,
  add column content_format public.knowledge_content_format not null default 'markdown';

create table public.design_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.design_documents (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  title text not null,
  summary text,
  content text not null default '',
  content_json jsonb,
  content_format public.knowledge_content_format not null default 'markdown',
  category text not null,
  status public.document_status not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create table public.lore_entry_versions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lore_entries (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  name text not null,
  summary text,
  content text not null default '',
  content_json jsonb,
  content_format public.knowledge_content_format not null default 'markdown',
  entry_type public.lore_entry_type not null,
  canon_status public.canon_status not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entry_id, version_number)
);

create table public.lore_entry_relationships (
  id uuid primary key default gen_random_uuid(),
  source_entry_id uuid not null references public.lore_entries (id) on delete cascade,
  target_entry_id uuid not null references public.lore_entries (id) on delete cascade,
  relationship_type public.lore_relationship_type not null default 'related_to',
  label text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (source_entry_id <> target_entry_id),
  unique (source_entry_id, target_entry_id, relationship_type)
);

create index design_document_versions_document_id_idx
  on public.design_document_versions (document_id, version_number desc);

create index lore_entry_versions_entry_id_idx
  on public.lore_entry_versions (entry_id, version_number desc);

create index lore_entry_relationships_source_idx
  on public.lore_entry_relationships (source_entry_id);

create index lore_entry_relationships_target_idx
  on public.lore_entry_relationships (target_entry_id);

alter table public.design_document_versions enable row level security;
alter table public.lore_entry_versions enable row level security;
alter table public.lore_entry_relationships enable row level security;

create policy "Users can view design document versions"
  on public.design_document_versions for select
  using (
    exists (
      select 1 from public.design_documents d
      where d.id = design_document_versions.document_id
        and private.can_view_project(d.project_id)
    )
  );

create policy "Editors can manage design document versions"
  on public.design_document_versions for all
  using (
    exists (
      select 1 from public.design_documents d
      where d.id = design_document_versions.document_id
        and private.can_edit_project(d.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.design_documents d
      where d.id = design_document_versions.document_id
        and private.can_edit_project(d.project_id)
    )
  );

create policy "Users can view lore entry versions"
  on public.lore_entry_versions for select
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_versions.entry_id
        and private.can_view_project(e.project_id)
    )
  );

create policy "Editors can manage lore entry versions"
  on public.lore_entry_versions for all
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_versions.entry_id
        and private.can_edit_project(e.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_versions.entry_id
        and private.can_edit_project(e.project_id)
    )
  );

create policy "Users can view lore relationships"
  on public.lore_entry_relationships for select
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_relationships.source_entry_id
        and private.can_view_project(e.project_id)
    )
  );

create policy "Editors can manage lore relationships"
  on public.lore_entry_relationships for all
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_relationships.source_entry_id
        and private.can_edit_project(e.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_relationships.source_entry_id
        and private.can_edit_project(e.project_id)
    )
  );
