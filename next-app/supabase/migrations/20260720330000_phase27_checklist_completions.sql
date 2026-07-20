-- Track who completed checklist items and auto-sync task progress from checklist completion.

alter table public.task_checklist_items
  add column if not exists completed_by uuid references public.profiles (id) on delete set null,
  add column if not exists completed_at timestamptz;

create index if not exists task_checklist_items_completed_by_idx
  on public.task_checklist_items (completed_by);

create or replace function public.sync_task_progress_from_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_task_id uuid;
  total_count integer;
  done_count integer;
  next_progress integer;
begin
  target_task_id := coalesce(new.task_id, old.task_id);

  select count(*), count(*) filter (where completed)
    into total_count, done_count
  from public.task_checklist_items
  where task_id = target_task_id;

  if total_count = 0 then
    next_progress := 0;
  else
    next_progress := round((done_count::numeric / total_count::numeric) * 100);
  end if;

  update public.tasks
  set progress = next_progress,
      updated_at = now()
  where id = target_task_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists task_checklist_items_sync_progress on public.task_checklist_items;

create trigger task_checklist_items_sync_progress
after insert or update of completed or delete on public.task_checklist_items
for each row
execute function public.sync_task_progress_from_checklist();
