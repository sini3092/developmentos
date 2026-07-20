-- DevelopmentOS Phase 7: Notifications for inbox + assignment triggers

create type public.notification_type as enum (
  'task_assigned',
  'task_comment',
  'roadmap_update',
  'task_blocked'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(trim(title)) > 0),
  body text,
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_workspace_idx
  on public.notifications (user_id, workspace_id, created_at desc);

create index notifications_unread_idx
  on public.notifications (user_id, workspace_id)
  where read_at is null;

create or replace function private.create_notification(
  p_workspace_id uuid,
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_entity_type text default null,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_user_id = auth.uid() then
    return;
  end if;

  if not private.is_workspace_member(p_workspace_id) then
    return;
  end if;

  insert into public.notifications (
    workspace_id,
    user_id,
    type,
    title,
    body,
    link,
    entity_type,
    entity_id
  )
  values (
    p_workspace_id,
    p_user_id,
    p_type,
    trim(p_title),
    nullif(trim(p_body), ''),
    p_link,
    p_entity_type,
    p_entity_id
  );
end;
$$;

create or replace function public.notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_slug text;
begin
  if new.assignee_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.assignee_id is not distinct from new.assignee_id then
    return new;
  end if;

  select slug into project_slug from public.projects where id = new.project_id;

  perform private.create_notification(
    new.workspace_id,
    new.assignee_id,
    'task_assigned',
    'Assigned: ' || new.identifier,
    new.title,
    '/projects/' || project_slug || '/tasks?task=' || new.id,
    'task',
    new.id
  );

  return new;
end;
$$;

create trigger tasks_notify_assignment
  after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_task_assignment();

create or replace function public.notify_task_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.tasks%rowtype;
  project_slug text;
begin
  select * into task_row from public.tasks where id = new.task_id;

  if not found or task_row.assignee_id is null then
    return new;
  end if;

  select slug into project_slug from public.projects where id = task_row.project_id;

  perform private.create_notification(
    task_row.workspace_id,
    task_row.assignee_id,
    'task_comment',
    'Comment on ' || task_row.identifier,
    left(new.body, 200),
    '/projects/' || project_slug || '/tasks?task=' || task_row.id,
    'task',
    task_row.id
  );

  return new;
end;
$$;

create trigger task_comments_notify_assignee
  after insert on public.task_comments
  for each row execute function public.notify_task_comment();

create or replace function public.notify_task_blocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_slug text;
begin
  if new.status <> 'blocked' or old.status = 'blocked' then
    return new;
  end if;

  if new.assignee_id is null then
    return new;
  end if;

  select slug into project_slug from public.projects where id = new.project_id;

  perform private.create_notification(
    new.workspace_id,
    new.assignee_id,
    'task_blocked',
    'Blocked: ' || new.identifier,
    new.title,
    '/projects/' || project_slug || '/tasks?task=' || new.id,
    'task',
    new.id
  );

  return new;
end;
$$;

create trigger tasks_notify_blocked
  after update of status on public.tasks
  for each row execute function public.notify_task_blocked();

create or replace function public.post_initiative_update(
  p_initiative_id uuid,
  p_health public.initiative_health,
  p_progress integer,
  p_summary text,
  p_accomplishments text default null,
  p_blockers text default null,
  p_next_steps text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  initiative public.initiatives%rowtype;
  update_id uuid;
  project_slug text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into initiative from public.initiatives where id = p_initiative_id;
  if not found then
    raise exception 'Initiative not found';
  end if;

  if not private.can_edit_project(initiative.project_id) then
    raise exception 'Not allowed to update this initiative';
  end if;

  insert into public.initiative_updates (
    initiative_id,
    author_id,
    health,
    progress,
    summary,
    accomplishments,
    blockers,
    next_steps
  )
  values (
    p_initiative_id,
    auth.uid(),
    p_health,
    p_progress,
    trim(p_summary),
    nullif(trim(p_accomplishments), ''),
    nullif(trim(p_blockers), ''),
    nullif(trim(p_next_steps), '')
  )
  returning id into update_id;

  update public.initiatives
  set
    health = p_health,
    progress = p_progress,
    updated_at = now()
  where id = p_initiative_id;

  perform private.log_activity_event(
    initiative.workspace_id,
    initiative.project_id,
    'roadmap.updated',
    'initiative',
    initiative.id,
    null,
    jsonb_build_object(
      'health', p_health,
      'progress', p_progress,
      'summary', trim(p_summary)
    ),
    'posted update on ' || initiative.name
  );

  if initiative.owner_id is not null then
    select slug into project_slug from public.projects where id = initiative.project_id;
    perform private.create_notification(
      initiative.workspace_id,
      initiative.owner_id,
      'roadmap_update',
      'Update: ' || initiative.name,
      trim(p_summary),
      '/projects/' || project_slug || '/roadmap/' || initiative.slug,
      'initiative',
      initiative.id
    );
  end if;

  return update_id;
end;
$$;

alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (
    user_id = auth.uid()
    and private.is_workspace_member(workspace_id)
  );

create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (user_id = auth.uid());

grant execute on function private.create_notification(uuid, uuid, public.notification_type, text, text, text, text, uuid) to authenticated;
