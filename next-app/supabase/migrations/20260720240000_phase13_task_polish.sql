-- DevelopmentOS Phase 13: Task attachments, table view support

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete restrict,
  file_name text not null check (char_length(trim(file_name)) > 0),
  file_path text not null,
  file_size integer not null check (file_size > 0),
  mime_type text,
  created_at timestamptz not null default now()
);

create index task_attachments_task_id_idx
  on public.task_attachments (task_id, created_at desc);

alter table public.task_attachments enable row level security;

create policy "Users can view task attachments"
  on public.task_attachments for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can manage task attachments"
  on public.task_attachments for all
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.tasks t
      where t.id = task_attachments.task_id
        and private.can_edit_project(t.project_id)
    )
  );

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', false, 10485760)
on conflict (id) do update
set file_size_limit = excluded.file_size_limit;

create policy "Project members can read task attachment files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.tasks t
      where t.id = (split_part(name, '/', 1))::uuid
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can upload task attachment files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.tasks t
      where t.id = (split_part(name, '/', 1))::uuid
        and private.can_edit_project(t.project_id)
    )
  );

create policy "Editors can delete task attachment files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-attachments'
    and exists (
      select 1
      from public.tasks t
      where t.id = (split_part(name, '/', 1))::uuid
        and private.can_edit_project(t.project_id)
    )
  );
