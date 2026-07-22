-- Lore Phase 6: Development integration (implementation status + dev links)

create type public.lore_implementation_status as enum (
  'not_started',
  'planned',
  'in_progress',
  'implemented',
  'needs_update'
);

create type public.lore_development_link_type as enum (
  'asset',
  'initiative',
  'milestone'
);

alter table public.lore_entries
  add column if not exists implementation_status public.lore_implementation_status not null default 'not_started';

create table public.lore_development_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lore_entries (id) on delete cascade,
  link_type public.lore_development_link_type not null,
  linked_id uuid not null,
  created_at timestamptz not null default now(),
  unique (entry_id, link_type, linked_id)
);

create index lore_development_links_entry_id_idx
  on public.lore_development_links (entry_id, link_type);

alter table public.lore_development_links enable row level security;

create policy "Users can view lore development links"
  on public.lore_development_links for select
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_development_links.entry_id
        and private.can_view_project(e.project_id)
    )
  );

create policy "Editors can manage lore development links"
  on public.lore_development_links for all
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_development_links.entry_id
        and private.can_edit_project(e.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_development_links.entry_id
        and private.can_edit_project(e.project_id)
    )
  );
