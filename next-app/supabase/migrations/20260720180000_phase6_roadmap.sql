-- DevelopmentOS Phase 6: Roadmap initiatives and milestones

create type public.initiative_status as enum (
  'idea',
  'planned',
  'active',
  'paused',
  'completed',
  'cancelled'
);

create type public.initiative_health as enum (
  'on_track',
  'at_risk',
  'off_track',
  'no_status'
);

create type public.initiative_priority as enum (
  'urgent',
  'high',
  'medium',
  'low',
  'none'
);

create type public.planning_horizon as enum (
  'now',
  'next',
  'later'
);

create type public.milestone_status as enum (
  'draft',
  'planned',
  'active',
  'completed',
  'missed',
  'cancelled'
);

create table public.initiatives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text,
  owner_id uuid references auth.users (id) on delete set null,
  status public.initiative_status not null default 'idea',
  priority public.initiative_priority not null default 'medium',
  health public.initiative_health not null default 'no_status',
  planning_horizon public.planning_horizon not null default 'later',
  progress integer not null default 0 check (progress between 0 and 100),
  target_start date,
  target_completion date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.initiative_updates (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  health public.initiative_health not null,
  progress integer not null check (progress between 0 and 100),
  summary text not null check (char_length(trim(summary)) > 0),
  accomplishments text,
  blockers text,
  next_steps text,
  created_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  initiative_id uuid references public.initiatives (id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  owner_id uuid references auth.users (id) on delete set null,
  status public.milestone_status not null default 'draft',
  health public.initiative_health not null default 'no_status',
  progress integer not null default 0 check (progress between 0 and 100),
  target_start date,
  target_date date,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.milestone_updates (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  health public.initiative_health not null,
  progress integer not null check (progress between 0 and 100),
  summary text not null check (char_length(trim(summary)) > 0),
  accomplishments text,
  blockers text,
  next_steps text,
  created_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists initiative_id uuid references public.initiatives (id) on delete set null;

alter table public.tasks
  add column if not exists milestone_id uuid references public.milestones (id) on delete set null;

create index initiatives_project_id_idx on public.initiatives (project_id);
create index initiatives_horizon_idx on public.initiatives (project_id, planning_horizon);
create index initiative_updates_initiative_id_idx on public.initiative_updates (initiative_id, created_at desc);
create index milestones_project_id_idx on public.milestones (project_id);
create index milestones_initiative_id_idx on public.milestones (initiative_id);
create index milestone_updates_milestone_id_idx on public.milestone_updates (milestone_id, created_at desc);
create index tasks_initiative_id_idx on public.tasks (initiative_id) where deleted_at is null;
create index tasks_milestone_id_idx on public.tasks (milestone_id) where deleted_at is null;

create trigger initiatives_set_updated_at
  before update on public.initiatives
  for each row execute function public.set_updated_at();

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

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

  return update_id;
end;
$$;

create or replace function public.seed_starter_initiatives(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  project public.projects%rowtype;
  starter record;
  created_count integer := 0;
begin
  select * into project from public.projects where id = p_project_id;
  if not found then
    raise exception 'Project not found';
  end if;

  if not private.can_edit_project(p_project_id) then
    raise exception 'Not allowed';
  end if;

  for starter in
    select *
    from (
      values
        ('Prototype Foundation', 'prototype-foundation', 'now', 'active', 35),
        ('Core Survival Loop', 'core-survival-loop', 'now', 'planned', 10),
        ('World Prototype', 'world-prototype', 'next', 'planned', 5),
        ('Settlement Prototype', 'settlement-prototype', 'later', 'idea', 0)
    ) as t(name, slug, horizon, status, progress)
  loop
    if not exists (
      select 1 from public.initiatives
      where project_id = p_project_id and slug = starter.slug
    ) then
      insert into public.initiatives (
        workspace_id,
        project_id,
        name,
        slug,
        summary,
        planning_horizon,
        status,
        progress,
        created_by,
        owner_id
      )
      values (
        project.workspace_id,
        p_project_id,
        starter.name,
        starter.slug,
        'Starter initiative from the DevelopmentOS product plan.',
        starter.horizon::public.planning_horizon,
        starter.status::public.initiative_status,
        starter.progress,
        auth.uid(),
        auth.uid()
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

alter table public.initiatives enable row level security;
alter table public.initiative_updates enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_updates enable row level security;

create policy "Users can view project initiatives"
  on public.initiatives for select
  using (private.can_view_project(project_id));

create policy "Editors can manage initiatives"
  on public.initiatives for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view initiative updates"
  on public.initiative_updates for select
  using (
    exists (
      select 1 from public.initiatives i
      where i.id = initiative_updates.initiative_id
        and private.can_view_project(i.project_id)
    )
  );

create policy "Editors can post initiative updates"
  on public.initiative_updates for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.initiatives i
      where i.id = initiative_updates.initiative_id
        and private.can_edit_project(i.project_id)
    )
  );

create policy "Users can view project milestones"
  on public.milestones for select
  using (private.can_view_project(project_id));

create policy "Editors can manage milestones"
  on public.milestones for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view milestone updates"
  on public.milestone_updates for select
  using (
    exists (
      select 1 from public.milestones m
      where m.id = milestone_updates.milestone_id
        and private.can_view_project(m.project_id)
    )
  );

create policy "Editors can post milestone updates"
  on public.milestone_updates for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.milestones m
      where m.id = milestone_updates.milestone_id
        and private.can_edit_project(m.project_id)
    )
  );

grant execute on function public.post_initiative_update(uuid, public.initiative_health, integer, text, text, text, text) to authenticated;
grant execute on function public.seed_starter_initiatives(uuid) to authenticated;
