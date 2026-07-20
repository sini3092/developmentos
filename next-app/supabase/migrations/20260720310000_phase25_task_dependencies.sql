-- DevelopmentOS Phase 25: Task dependency links (blocked-by relationships)

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

create index task_dependencies_task_id_idx
  on public.task_dependencies (task_id);

create index task_dependencies_depends_on_task_id_idx
  on public.task_dependencies (depends_on_task_id);

alter table public.task_dependencies enable row level security;

create policy "Users can view task dependencies"
  on public.task_dependencies for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_dependencies.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can manage task dependencies"
  on public.task_dependencies for all
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_dependencies.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_dependencies.task_id
        and private.can_edit_project(t.project_id)
    )
    and exists (
      select 1
      from public.tasks blocker
      where blocker.id = task_dependencies.depends_on_task_id
        and blocker.project_id = (
          select dependent.project_id
          from public.tasks dependent
          where dependent.id = task_dependencies.task_id
        )
    )
  );
