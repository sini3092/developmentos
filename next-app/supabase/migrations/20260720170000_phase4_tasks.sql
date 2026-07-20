-- DevelopmentOS Phase 4: Task database, permissions, and activity events

create type public.task_status as enum (
  'backlog',
  'ready',
  'in_progress',
  'in_review',
  'blocked',
  'done',
  'cancelled'
);

create type public.task_priority as enum (
  'urgent',
  'high',
  'medium',
  'low',
  'none'
);

create type public.discipline as enum (
  'design',
  'programming',
  '3d_art',
  '2d_art',
  'animation',
  'audio',
  'narrative',
  'worldbuilding',
  'ui_ux',
  'testing',
  'production'
);

alter table public.projects
  add column if not exists task_prefix text;

update public.projects
set task_prefix = upper(left(regexp_replace(slug, '[^a-z0-9]', '', 'g'), 4))
where task_prefix is null;

alter table public.projects
  alter column task_prefix set not null;

alter table public.projects
  add constraint projects_task_prefix_format
  check (task_prefix ~ '^[A-Z0-9]{2,6}$');

create table public.project_task_counters (
  project_id uuid primary key references public.projects (id) on delete cascade,
  next_number integer not null default 1 check (next_number > 0)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  number integer not null check (number > 0),
  identifier text not null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text,
  status public.task_status not null default 'backlog',
  priority public.task_priority not null default 'none',
  assignee_id uuid references auth.users (id) on delete set null,
  creator_id uuid not null references auth.users (id) on delete restrict,
  discipline public.discipline,
  parent_task_id uuid references public.tasks (id) on delete set null,
  start_date date,
  due_date date,
  estimate_hours numeric(6, 2) check (estimate_hours is null or estimate_hours >= 0),
  progress integer not null default 0 check (progress between 0 and 100),
  board_position numeric not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number),
  unique (workspace_id, identifier)
);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  color text not null default 'slate',
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table public.task_labels (
  task_id uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (task_id, label_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  previous_value jsonb,
  new_value jsonb,
  message text,
  created_at timestamptz not null default now()
);

create index tasks_project_id_idx on public.tasks (project_id) where deleted_at is null;
create index tasks_assignee_id_idx on public.tasks (assignee_id) where deleted_at is null;
create index tasks_status_idx on public.tasks (project_id, status) where deleted_at is null;
create index tasks_due_date_idx on public.tasks (due_date) where deleted_at is null;
create index task_comments_task_id_idx on public.task_comments (task_id);
create index activity_events_project_id_idx on public.activity_events (project_id, created_at desc);
create index activity_events_entity_idx on public.activity_events (entity_type, entity_id, created_at desc);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger task_comments_set_updated_at
  before update on public.task_comments
  for each row execute function public.set_updated_at();

create or replace function private.set_project_task_prefix()
returns trigger
language plpgsql
as $$
begin
  if new.task_prefix is null or btrim(new.task_prefix) = '' then
    new.task_prefix := upper(left(regexp_replace(new.slug, '[^a-z0-9]', '', 'g'), 4));
  else
    new.task_prefix := upper(new.task_prefix);
  end if;
  return new;
end;
$$;

create trigger projects_set_task_prefix
  before insert or update on public.projects
  for each row execute function private.set_project_task_prefix();

insert into public.project_task_counters (project_id, next_number)
select id, 1 from public.projects
on conflict (project_id) do nothing;

create or replace function private.can_edit_project(project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = can_edit_project.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'project_lead', 'team_member')
  )
  or exists (
    select 1
    from public.projects p
    join public.workspace_members wm
      on wm.workspace_id = p.workspace_id
     and wm.user_id = auth.uid()
    where p.id = can_edit_project.project_id
      and wm.role = 'owner'
      and private.can_view_project(p.id)
  );
$$;

create or replace function private.log_activity_event(
  p_workspace_id uuid,
  p_project_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_previous_value jsonb default null,
  p_new_value jsonb default null,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_events (
    workspace_id,
    project_id,
    actor_id,
    event_type,
    entity_type,
    entity_id,
    previous_value,
    new_value,
    message
  )
  values (
    p_workspace_id,
    p_project_id,
    auth.uid(),
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_previous_value,
    p_new_value,
    p_message
  );
end;
$$;

create or replace function public.create_task(
  p_project_id uuid,
  p_title text,
  p_description text default null,
  p_status public.task_status default 'backlog',
  p_priority public.task_priority default 'none',
  p_assignee_id uuid default null,
  p_discipline public.discipline default null,
  p_due_date date default null
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
    due_date
  )
  values (
    v_project.workspace_id,
    p_project_id,
    v_number,
    v_identifier,
    trim(p_title),
    nullif(trim(p_description), ''),
    p_status,
    p_priority,
    p_assignee_id,
    auth.uid(),
    p_discipline,
    p_due_date
  )
  returning * into v_task;

  perform private.log_activity_event(
    v_project.workspace_id,
    p_project_id,
    'task.created',
    'task',
    v_task.id,
    null,
    jsonb_build_object(
      'identifier', v_task.identifier,
      'title', v_task.title,
      'status', v_task.status
    ),
    'created task ' || v_task.identifier
  );

  if p_assignee_id is not null then
    perform private.log_activity_event(
      v_project.workspace_id,
      p_project_id,
      'task.assigned',
      'task',
      v_task.id,
      null,
      jsonb_build_object('assignee_id', p_assignee_id),
      'assigned task ' || v_task.identifier
    );
  end if;

  return v_task;
end;
$$;

create or replace function public.log_task_field_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform private.log_activity_event(
      new.workspace_id,
      new.project_id,
      'task.status_changed',
      'task',
      new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      'changed status on ' || new.identifier
    );
  end if;

  if tg_op = 'UPDATE' and old.assignee_id is distinct from new.assignee_id then
    perform private.log_activity_event(
      new.workspace_id,
      new.project_id,
      'task.assigned',
      'task',
      new.id,
      jsonb_build_object('assignee_id', old.assignee_id),
      jsonb_build_object('assignee_id', new.assignee_id),
      'reassigned ' || new.identifier
    );
  end if;

  if tg_op = 'UPDATE' and old.priority is distinct from new.priority then
    perform private.log_activity_event(
      new.workspace_id,
      new.project_id,
      'task.priority_changed',
      'task',
      new.id,
      jsonb_build_object('priority', old.priority),
      jsonb_build_object('priority', new.priority),
      'changed priority on ' || new.identifier
    );
  end if;

  return new;
end;
$$;

create trigger tasks_log_changes
  after update on public.tasks
  for each row execute function public.log_task_field_change();

alter table public.tasks enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.activity_events enable row level security;

create policy "Users can view project tasks"
  on public.tasks for select
  using (private.can_view_project(project_id) and deleted_at is null);

create policy "Editors can create tasks"
  on public.tasks for insert
  with check (
    private.can_edit_project(project_id)
    and creator_id = auth.uid()
  );

create policy "Editors can update tasks"
  on public.tasks for update
  using (private.can_edit_project(project_id) and deleted_at is null)
  with check (private.can_edit_project(project_id));

create policy "Managers can soft delete tasks"
  on public.tasks for update
  using (private.can_manage_project(project_id))
  with check (private.can_manage_project(project_id));

create policy "Users can view project labels"
  on public.labels for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = labels.project_id
        and private.can_view_project(p.id)
    )
  );

create policy "Editors can manage labels"
  on public.labels for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = labels.project_id
        and private.can_edit_project(p.id)
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = labels.project_id
        and private.can_edit_project(p.id)
    )
  );

create policy "Users can view task labels"
  on public.task_labels for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_labels.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can manage task labels"
  on public.task_labels for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_labels.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_labels.task_id
        and private.can_edit_project(t.project_id)
    )
  );

create policy "Users can view task comments"
  on public.task_comments for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can create task comments"
  on public.task_comments for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id
        and private.can_edit_project(t.project_id)
    )
  );

create policy "Authors can update their comments"
  on public.task_comments for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Users can view checklist items"
  on public.task_checklist_items for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_checklist_items.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can manage checklist items"
  on public.task_checklist_items for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_checklist_items.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_checklist_items.task_id
        and private.can_edit_project(t.project_id)
    )
  );

create policy "Users can view project activity"
  on public.activity_events for select
  using (
    project_id is not null
    and private.can_view_project(project_id)
  );

grant execute on function private.can_edit_project(uuid) to authenticated;
grant execute on function public.create_task(uuid, text, text, public.task_status, public.task_priority, uuid, public.discipline, date) to authenticated;
