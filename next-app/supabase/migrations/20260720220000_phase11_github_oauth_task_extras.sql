-- DevelopmentOS Phase 11: GitHub OAuth, PR linking, task labels/checklists activity

create table public.github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  github_user_id bigint not null,
  github_username text not null,
  access_token text not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_github_pull_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  repo_owner text not null,
  repo_name text not null,
  pr_number integer not null check (pr_number > 0),
  pr_url text not null,
  pr_title text not null,
  pr_state text not null default 'open' check (pr_state in ('open', 'closed', 'merged')),
  linked_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, repo_owner, repo_name, pr_number)
);

create index task_github_pull_requests_task_id_idx
  on public.task_github_pull_requests (task_id);

create trigger github_connections_set_updated_at
  before update on public.github_connections
  for each row execute function public.set_updated_at();

create trigger task_github_pull_requests_set_updated_at
  before update on public.task_github_pull_requests
  for each row execute function public.set_updated_at();

create or replace function public.log_task_pr_link_activity()
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
    'task.pr_linked',
    'task',
    new.task_id,
    null,
    jsonb_build_object(
      'pr_number', new.pr_number,
      'pr_title', new.pr_title,
      'pr_url', new.pr_url,
      'pr_state', new.pr_state
    ),
    'linked PR #' || new.pr_number || ' to ' || v_task.identifier
  );

  return new;
end;
$$;

create trigger task_github_pull_requests_log_activity
  after insert on public.task_github_pull_requests
  for each row execute function public.log_task_pr_link_activity();

alter table public.github_connections enable row level security;
alter table public.task_github_pull_requests enable row level security;

create policy "Users manage own github connection"
  on public.github_connections for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can view task github pull requests"
  on public.task_github_pull_requests for select
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_pull_requests.task_id
        and private.can_view_project(t.project_id)
    )
  );

create policy "Editors can manage task github pull requests"
  on public.task_github_pull_requests for all
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_pull_requests.task_id
        and private.can_edit_project(t.project_id)
    )
  )
  with check (
    exists (
      select 1
      from public.tasks t
      where t.id = task_github_pull_requests.task_id
        and private.can_edit_project(t.project_id)
    )
  );
