-- Lore Phase 3: Internal wiki links between entries

create table public.lore_entry_links (
  id uuid primary key default gen_random_uuid(),
  source_entry_id uuid not null references public.lore_entries (id) on delete cascade,
  target_entry_id uuid not null references public.lore_entries (id) on delete cascade,
  anchor_text text,
  created_at timestamptz not null default now(),
  check (source_entry_id <> target_entry_id),
  unique (source_entry_id, target_entry_id)
);

create index lore_entry_links_source_idx on public.lore_entry_links (source_entry_id);
create index lore_entry_links_target_idx on public.lore_entry_links (target_entry_id);

alter table public.lore_entry_links enable row level security;

create policy "Users can view lore entry links"
  on public.lore_entry_links for select
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_links.source_entry_id
        and private.can_view_project(e.project_id)
    )
  );

create policy "Editors can manage lore entry links"
  on public.lore_entry_links for all
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_links.source_entry_id
        and private.can_edit_project(e.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_entry_links.source_entry_id
        and private.can_edit_project(e.project_id)
    )
  );
