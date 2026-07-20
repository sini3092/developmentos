-- DevelopmentOS Phase 18: GitHub webhooks, branch linking, commit activity

alter table public.projects
  add column if not exists github_webhook_secret text;

create table public.task_github_branches (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  repo_owner text not null,
  repo_name text not null,
  branch_name text not null check (char_length(trim(branch_name)) between 1 and 255),
  linked_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, repo_owner, repo_name, branch_name)
);

create table public.github_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_id text not null unique,
  project_id uuid not null references public.projects (id) on delete cascade,
  event_type text not null,
  created_at timestamptz not null default now()
);

create index task_github_branches_task_id_idx
  on public.task_github_branches (task_id);

create index task_github_branches_branch_lookup_idx
  on public.task_github_branches (repo_owner, repo_name, branch_name);

create index github_webhook_deliveries_project_id_idx
  on public.github_webhook_deliveries (project_id, created_at desc);

create trigger task_github_branches_set_updated_at
  before update on public.task_github_branches
  for each row execute function public.set_updated_at();

create or replace function public.log_task_branch_link_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = new.task_id;

  if v_task.id is null then
    return new;
  end if;

  perform private.log_activity_event(
    v_task.workspace_id,
    v_task.project_id,
    'task.branch_linked',
    'task',
    new.task_id,
    null,
    jsonb_build_object(
      'branch_name', new.branch_name,
      'repo_owner', new.repo_owner,
      'repo_name', new.repo_name
    ),
    'linked branch ' || new.branch_name || ' to ' || v_task.identifier
  );

  return new;
end;
$$;

create trigger task_github_branches_log_activity
  after insert on public.task_github_branches
  for each row execute function public.log_task_branch_link_activity();

create or replace function public.log_github_activity_event(
  p_workspace_id uuid,
  p_project_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
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
    new_value,
    message
  )
  values (
    p_workspace_id,
    p_project_id,
    null,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_new_value,
    p_message
  );
end;
$$;

alter table public.task_github_branches enable row level security;
alter table public.github_webhook_deliveries enable row level security;

create policy "Users can view task github branches"
  on public.task_github_branches for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_branches.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can manage task github branches"
  on public.task_github_branches for all
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_branches.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_branches.task_id
        and private.can_edit_project(t.project_id)
    )
  );
