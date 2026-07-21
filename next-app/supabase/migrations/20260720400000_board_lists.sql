-- Trello-style board lists for custom task columns

create table public.board_lists (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default 'slate',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_lists_project_position_idx on public.board_lists (project_id, position);

alter table public.tasks
  add column if not exists list_id uuid references public.board_lists (id) on delete set null;

create index tasks_list_board_position_idx on public.tasks (project_id, list_id, board_position)
  where deleted_at is null;

alter table public.board_lists enable row level security;

create policy "Users can view project board lists"
  on public.board_lists for select
  using (private.can_view_project(project_id));

create policy "Editors can manage board lists"
  on public.board_lists for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create or replace function public.ensure_project_board_lists(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.board_lists where project_id = p_project_id
  ) then
    return;
  end if;

  insert into public.board_lists (project_id, name, color, position)
  values
    (p_project_id, 'Backlog', 'slate', 1000),
    (p_project_id, 'In progress', 'blue', 2000),
    (p_project_id, 'Bugs', 'red', 3000),
    (p_project_id, 'Done', 'green', 4000);
end;
$$;

grant execute on function public.ensure_project_board_lists(uuid) to authenticated;

-- Backfill lists for existing projects
select public.ensure_project_board_lists(id) from public.projects;

-- Map existing tasks to lists by status
update public.tasks t
set list_id = bl.id
from public.board_lists bl
where t.list_id is null
  and t.deleted_at is null
  and bl.project_id = t.project_id
  and bl.name = case t.status
    when 'backlog' then 'Backlog'
    when 'ready' then 'Backlog'
    when 'in_progress' then 'In progress'
    when 'in_review' then 'In progress'
    when 'blocked' then 'Bugs'
    when 'done' then 'Done'
    else 'Backlog'
  end;

-- Remaining tasks without a list go to the first list
update public.tasks t
set list_id = (
  select bl.id
  from public.board_lists bl
  where bl.project_id = t.project_id
  order by bl.position
  limit 1
)
where t.list_id is null
  and t.deleted_at is null;

create or replace function public.create_task(
  p_project_id uuid,
  p_title text,
  p_description text default null,
  p_status public.task_status default 'backlog',
  p_priority public.task_priority default 'none',
  p_assignee_id uuid default null,
  p_discipline public.discipline default null,
  p_due_date date default null,
  p_list_id uuid default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_number integer;
  v_identifier text;
  v_task public.tasks%rowtype;
  v_list_id uuid;
  v_board_position numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not private.can_edit_project(p_project_id) then
    raise exception 'Not allowed to create tasks in this project';
  end if;

  perform public.ensure_project_board_lists(p_project_id);

  select * into v_project
  from public.projects
  where id = p_project_id
    and status = 'active';

  if not found then
    raise exception 'Project not found';
  end if;

  if p_list_id is not null then
    select id into v_list_id
    from public.board_lists
    where id = p_list_id
      and project_id = p_project_id;
  end if;

  if v_list_id is null then
    select id into v_list_id
    from public.board_lists
    where project_id = p_project_id
    order by position
    limit 1;
  end if;

  select coalesce(max(board_position), 0) + 1000 into v_board_position
  from public.tasks
  where project_id = p_project_id
    and list_id = v_list_id
    and deleted_at is null;

  insert into public.project_task_counters (project_id, next_number)
  values (p_project_id, 1)
  on conflict (project_id) do nothing;

  update public.project_task_counters
  set next_number = next_number + 1
  where project_id = p_project_id
  returning next_number - 1 into v_number;

  v_identifier := v_project.task_prefix || '-' || lpad(v_number::text, 3, '0');

  insert into public.tasks (
    workspace_id,
    project_id,
    number,
    identifier,
    title,
    description,
    status,
    priority,
    assignee_id,
    creator_id,
    discipline,
    due_date,
    list_id,
    board_position
  )
  values (
    v_project.workspace_id,
    p_project_id,
    v_number,
    v_identifier,
    p_title,
    p_description,
    p_status,
    p_priority,
    p_assignee_id,
    auth.uid(),
    p_discipline,
    p_due_date,
    v_list_id,
    v_board_position
  )
  returning * into v_task;

  return v_task;
end;
$$;

alter publication supabase_realtime add table public.board_lists;
