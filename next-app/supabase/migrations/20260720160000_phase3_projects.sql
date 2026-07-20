-- DevelopmentOS Phase 3: Projects and memberships

create type public.project_role as enum (
  'owner',
  'project_lead',
  'team_member',
  'viewer'
);

create type public.project_status as enum (
  'active',
  'archived'
);

create type public.project_visibility as enum (
  'private',
  'workspace'
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  color text not null default 'blue' check (color in (
    'blue', 'emerald', 'amber', 'purple', 'rose', 'cyan', 'orange', 'slate'
  )),
  status public.project_status not null default 'active',
  visibility public.project_visibility not null default 'workspace',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, slug)
);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.project_role not null default 'team_member',
  joined_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index projects_workspace_id_idx on public.projects (workspace_id);
create index projects_status_idx on public.projects (workspace_id, status);
create index project_members_project_id_idx on public.project_members (project_id);
create index project_members_user_id_idx on public.project_members (user_id);

create or replace function private.is_project_member(project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = is_project_member.project_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.can_view_project(project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects p
    join public.workspace_members wm
      on wm.workspace_id = p.workspace_id
     and wm.user_id = auth.uid()
    where p.id = can_view_project.project_id
      and p.status = 'active'
      and (
        p.visibility = 'workspace'
        or private.is_project_member(p.id)
      )
  );
$$;

create or replace function private.can_manage_project(project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = can_manage_project.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('owner', 'project_lead')
  )
  or exists (
    select 1
    from public.projects p
    join public.workspace_members wm
      on wm.workspace_id = p.workspace_id
     and wm.user_id = auth.uid()
    where p.id = can_manage_project.project_id
      and wm.role = 'owner'
  );
$$;

create or replace function private.can_create_project(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('owner', 'project_lead')
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create or replace function public.create_project_with_owner(
  ws_id uuid,
  project_name text,
  project_slug text,
  project_description text default null,
  project_color text default 'blue',
  project_visibility public.project_visibility default 'workspace'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not private.can_create_project(ws_id) then
    raise exception 'Not allowed to create projects in this workspace';
  end if;

  insert into public.projects (
    workspace_id,
    name,
    slug,
    description,
    color,
    visibility,
    created_by
  )
  values (
    ws_id,
    trim(project_name),
    project_slug,
    nullif(trim(project_description), ''),
    project_color,
    project_visibility,
    auth.uid()
  )
  returning id into new_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (new_project_id, auth.uid(), 'owner');

  return new_project_id;
end;
$$;

create or replace function public.seed_starter_projects(ws_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  starter record;
  created_count integer := 0;
  new_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not private.can_create_project(ws_id) then
    raise exception 'Not allowed to create projects in this workspace';
  end if;

  for starter in
    select *
    from (
      values
        ('Core Game', 'core-game', 'blue'),
        ('Player Systems', 'player-systems', 'emerald'),
        ('World and Environment', 'world-env', 'amber'),
        ('Combat and Progression', 'combat-progression', 'rose'),
        ('Survival Systems', 'survival-systems', 'cyan'),
        ('Settlement', 'settlement', 'orange'),
        ('Art and Assets', 'art-assets', 'purple'),
        ('Narrative and Lore', 'narrative-lore', 'purple'),
        ('Production', 'production', 'slate')
    ) as t(name, slug, color)
  loop
    if not exists (
      select 1
      from public.projects
      where workspace_id = ws_id
        and slug = starter.slug
    ) then
      new_project_id := public.create_project_with_owner(
        ws_id,
        starter.name,
        starter.slug,
        null,
        starter.color,
        'workspace'
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

create policy "Users can view accessible projects"
  on public.projects for select
  using (private.can_view_project(id));

create policy "Managers can create projects"
  on public.projects for insert
  with check (
    private.can_create_project(workspace_id)
    and created_by = auth.uid()
  );

create policy "Managers can update projects"
  on public.projects for update
  using (private.can_manage_project(id))
  with check (private.can_manage_project(id));

create policy "Members can view project memberships"
  on public.project_members for select
  using (private.can_view_project(project_id));

create policy "Managers can add project members"
  on public.project_members for insert
  with check (private.can_manage_project(project_id));

create policy "Managers can update project members"
  on public.project_members for update
  using (private.can_manage_project(project_id))
  with check (private.can_manage_project(project_id));

create policy "Managers can remove project members"
  on public.project_members for delete
  using (private.can_manage_project(project_id));

grant execute on function private.is_project_member(uuid) to authenticated;
grant execute on function private.can_view_project(uuid) to authenticated;
grant execute on function private.can_manage_project(uuid) to authenticated;
grant execute on function private.can_create_project(uuid) to authenticated;
grant execute on function public.create_project_with_owner(uuid, text, text, text, text, public.project_visibility) to authenticated;
grant execute on function public.seed_starter_projects(uuid) to authenticated;
