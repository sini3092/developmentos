-- DevelopmentOS Phase 20: Task reference links (design docs and lore)

create type public.task_reference_type as enum (
  'design_document',
  'lore_entry'
);

create table public.task_reference_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  reference_type public.task_reference_type not null,
  reference_id uuid not null,
  created_at timestamptz not null default now(),
  unique (task_id, reference_type, reference_id)
);

create index task_reference_links_task_id_idx
  on public.task_reference_links (task_id);

alter table public.task_reference_links enable row level security;

create policy "Users can view task reference links"
  on public.task_reference_links for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_reference_links.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can manage task reference links"
  on public.task_reference_links for all
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_reference_links.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_reference_links.task_id
        and private.can_edit_project(t.project_id)
    )
  );
