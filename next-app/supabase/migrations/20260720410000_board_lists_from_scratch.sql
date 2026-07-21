-- Start board from scratch: no default lists, clear seeded data.

create or replace function public.ensure_project_board_lists(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Lists are created manually on the task board.
  return;
end;
$$;

-- Remove existing seeded lists and tasks so projects start empty.
update public.tasks
set deleted_at = now()
where deleted_at is null;

delete from public.board_lists;

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
    raise exception 'Create a list on the board before adding cards.';
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
