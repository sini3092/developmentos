-- Lore Phase 2: structured sections per entry

create table public.lore_sections (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lore_entries (id) on delete cascade,
  section_key text not null check (char_length(trim(section_key)) > 0),
  title text not null check (char_length(trim(title)) > 0),
  content text not null default '',
  content_json jsonb,
  content_format text not null default 'tiptap',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_id, section_key)
);

create index lore_sections_entry_position_idx
  on public.lore_sections (entry_id, position);

create trigger lore_sections_set_updated_at
  before update on public.lore_sections
  for each row execute function public.set_updated_at();

alter table public.lore_sections enable row level security;

create policy "Users can view lore sections"
  on public.lore_sections for select
  using (
    exists (
      select 1
      from public.lore_entries e
      where e.id = lore_sections.entry_id
        and private.can_view_project(e.project_id)
    )
  );

create policy "Editors can manage lore sections"
  on public.lore_sections for all
  using (
    exists (
      select 1
      from public.lore_entries e
      where e.id = lore_sections.entry_id
        and private.can_edit_project(e.project_id)
    )
  )
  with check (
    exists (
      select 1
      from public.lore_entries e
      where e.id = lore_sections.entry_id
        and private.can_edit_project(e.project_id)
    )
  );
