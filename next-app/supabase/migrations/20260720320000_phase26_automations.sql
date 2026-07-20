-- DevelopmentOS Phase 26: Project automation rules

alter type public.notification_type add value if not exists 'automation';

create type public.automation_trigger_type as enum (
  'task_created',
  'task_status_changed',
  'task_assigned'
);

create type public.automation_action_type as enum (
  'notify_assignee',
  'set_task_status',
  'add_label'
);

create table public.project_automations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  enabled boolean not null default true,
  trigger_type public.automation_trigger_type not null,
  trigger_config jsonb not null default '{}'::jsonb,
  condition_priority public.task_priority,
  condition_discipline public.discipline,
  condition_unassigned boolean not null default false,
  action_type public.automation_action_type not null,
  action_config jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_automations_project_id_idx
  on public.project_automations (project_id);

create trigger project_automations_set_updated_at
  before update on public.project_automations
  for each row execute function public.set_updated_at();

alter table public.project_automations enable row level security;

create policy "Users can view project automations"
  on public.project_automations for select
  using (private.can_view_project(project_id));

create policy "Editors can manage project automations"
  on public.project_automations for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create or replace function public.create_automation_notification(
  p_workspace_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_entity_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.create_notification(
    p_workspace_id,
    p_user_id,
    'automation',
    p_title,
    p_body,
    p_link,
    'task',
    p_entity_id
  );
end;
$$;

grant execute on function public.create_automation_notification(uuid, uuid, text, text, text, uuid)
  to authenticated;
