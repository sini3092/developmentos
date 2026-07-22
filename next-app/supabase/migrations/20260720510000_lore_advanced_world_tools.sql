-- Lore Phase 7: Advanced world tools (timeline, collections, maps, hierarchy)

create type public.lore_timeline_precision as enum (
  'exact',
  'approximate',
  'era_only',
  'unknown',
  'range'
);

create type public.lore_map_marker_type as enum (
  'settlement',
  'ruin',
  'dungeon',
  'landmark',
  'resource',
  'faction_territory',
  'quest_location',
  'other'
);

create table public.lore_eras (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  short_label text,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.lore_collections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  cover_image_url text,
  is_featured boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.lore_collection_entries (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.lore_collections (id) on delete cascade,
  entry_id uuid not null references public.lore_entries (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (collection_id, entry_id)
);

create index lore_collection_entries_collection_position_idx
  on public.lore_collection_entries (collection_id, position);

create table public.lore_world_maps (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text,
  image_url text not null check (char_length(trim(image_url)) > 0),
  is_primary boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lore_map_markers (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.lore_world_maps (id) on delete cascade,
  entry_id uuid references public.lore_entries (id) on delete set null,
  label text not null check (char_length(trim(label)) > 0),
  marker_type public.lore_map_marker_type not null default 'landmark',
  x_percent numeric(5, 2) not null check (x_percent >= 0 and x_percent <= 100),
  y_percent numeric(5, 2) not null check (y_percent >= 0 and y_percent <= 100),
  created_at timestamptz not null default now()
);

create index lore_map_markers_map_id_idx on public.lore_map_markers (map_id);

alter table public.lore_entries
  add column if not exists parent_entry_id uuid references public.lore_entries (id) on delete set null,
  add column if not exists timeline_label text,
  add column if not exists timeline_end_label text,
  add column if not exists timeline_sort_order integer,
  add column if not exists timeline_era_id uuid references public.lore_eras (id) on delete set null,
  add column if not exists timeline_precision public.lore_timeline_precision not null default 'unknown';

create index lore_entries_parent_entry_id_idx
  on public.lore_entries (project_id, parent_entry_id)
  where parent_entry_id is not null;

create index lore_entries_timeline_sort_idx
  on public.lore_entries (project_id, timeline_sort_order)
  where entry_type in ('historical_event', 'timeline_event');

create trigger lore_collections_set_updated_at
  before update on public.lore_collections
  for each row execute function public.set_updated_at();

create trigger lore_world_maps_set_updated_at
  before update on public.lore_world_maps
  for each row execute function public.set_updated_at();

alter table public.lore_eras enable row level security;
alter table public.lore_collections enable row level security;
alter table public.lore_collection_entries enable row level security;
alter table public.lore_world_maps enable row level security;
alter table public.lore_map_markers enable row level security;

create policy "Users can view lore eras"
  on public.lore_eras for select
  using (private.can_view_project(project_id));

create policy "Editors can manage lore eras"
  on public.lore_eras for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view lore collections"
  on public.lore_collections for select
  using (private.can_view_project(project_id));

create policy "Editors can manage lore collections"
  on public.lore_collections for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view lore collection entries"
  on public.lore_collection_entries for select
  using (
    exists (
      select 1 from public.lore_collections c
      where c.id = lore_collection_entries.collection_id
        and private.can_view_project(c.project_id)
    )
  );

create policy "Editors can manage lore collection entries"
  on public.lore_collection_entries for all
  using (
    exists (
      select 1 from public.lore_collections c
      where c.id = lore_collection_entries.collection_id
        and private.can_edit_project(c.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.lore_collections c
      where c.id = lore_collection_entries.collection_id
        and private.can_edit_project(c.project_id)
    )
  );

create policy "Users can view lore world maps"
  on public.lore_world_maps for select
  using (private.can_view_project(project_id));

create policy "Editors can manage lore world maps"
  on public.lore_world_maps for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view lore map markers"
  on public.lore_map_markers for select
  using (
    exists (
      select 1 from public.lore_world_maps m
      where m.id = lore_map_markers.map_id
        and private.can_view_project(m.project_id)
    )
  );

create policy "Editors can manage lore map markers"
  on public.lore_map_markers for all
  using (
    exists (
      select 1 from public.lore_world_maps m
      where m.id = lore_map_markers.map_id
        and private.can_edit_project(m.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.lore_world_maps m
      where m.id = lore_map_markers.map_id
        and private.can_edit_project(m.project_id)
    )
  );
