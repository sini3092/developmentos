-- Lore Phase 5: Versioning depth (change types, retcon metadata)

create type public.lore_change_type as enum ('minor', 'major', 'retcon');

alter table public.lore_entry_versions
  add column if not exists change_type public.lore_change_type;

alter table public.lore_entries
  add column if not exists retcon_reason text,
  add column if not exists retconned_at timestamptz,
  add column if not exists retconned_by uuid references auth.users (id) on delete set null,
  add column if not exists replacement_entry_id uuid references public.lore_entries (id) on delete set null;

create index lore_entries_retconned_idx
  on public.lore_entries (project_id, retconned_at desc)
  where canon_status = 'retconned';
