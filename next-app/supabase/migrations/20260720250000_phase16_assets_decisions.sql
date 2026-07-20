-- DevelopmentOS Phase 16: Asset library and decision log

create type public.asset_type as enum (
  'mesh',
  'texture',
  'material',
  'sprite',
  'animation',
  'audio',
  'vfx',
  'ui',
  'level',
  'prefab',
  'script',
  'other'
);

create type public.asset_status as enum (
  'concept',
  'wip',
  'in_review',
  'approved',
  'deprecated',
  'archived'
);

create type public.decision_status as enum (
  'proposed',
  'discussing',
  'accepted',
  'rejected',
  'superseded'
);

create type public.decision_link_type as enum (
  'task',
  'design_document',
  'lore_entry',
  'initiative'
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  asset_type public.asset_type not null default 'other',
  status public.asset_status not null default 'concept',
  description text,
  owner_id uuid references auth.users (id) on delete set null,
  version text not null default '0.1' check (char_length(trim(version)) between 1 and 40),
  source_path text,
  export_path text,
  engine_path text,
  preview_url text,
  tags text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.asset_task_links (
  asset_id uuid not null references public.assets (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (asset_id, task_id)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  context text not null default '',
  problem text not null default '',
  options text not null default '',
  selected_option text,
  reasoning text,
  status public.decision_status not null default 'proposed',
  owner_id uuid references auth.users (id) on delete set null,
  superseded_by uuid references public.decisions (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.decision_links (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id) on delete cascade,
  link_type public.decision_link_type not null,
  linked_id uuid not null,
  created_at timestamptz not null default now(),
  unique (decision_id, link_type, linked_id)
);

create index assets_project_id_idx on public.assets (project_id, updated_at desc);
create index assets_name_search_idx on public.assets (project_id, name);
create index decisions_project_id_idx on public.decisions (project_id, updated_at desc);
create index decisions_title_search_idx on public.decisions (project_id, title);
create index decision_links_decision_id_idx on public.decision_links (decision_id);

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create trigger decisions_set_updated_at
  before update on public.decisions
  for each row execute function public.set_updated_at();

create or replace function public.seed_starter_assets(p_project_id uuid)
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
        ('Iron Sword Model', 'iron-sword-model', 'mesh', 'wip', 'Player starting weapon mesh.', 'Assets/Weapons/IronSword.fbx', 'Content/Weapons/IronSword'),
        ('Forest Ground Texture', 'forest-ground-texture', 'texture', 'in_review', 'Tiling ground texture for forest biomes.', 'Textures/Terrain/ForestGround.png', 'Content/Materials/M_ForestGround'),
        ('Player Idle Animation', 'player-idle-animation', 'animation', 'concept', 'Default standing idle loop.', 'Animations/Player/Idle.fbx', 'Content/Characters/Player/Animations/Idle')
    ) as t(name, slug, asset_type, status, description, source_path, engine_path)
  loop
    if not exists (
      select 1 from public.assets
      where project_id = p_project_id and slug = starter.slug
    ) then
      insert into public.assets (
        workspace_id,
        project_id,
        name,
        slug,
        asset_type,
        status,
        description,
        source_path,
        engine_path,
        created_by,
        owner_id
      )
      values (
        project.workspace_id,
        p_project_id,
        starter.name,
        starter.slug,
        starter.asset_type::public.asset_type,
        starter.status::public.asset_status,
        starter.description,
        starter.source_path,
        starter.engine_path,
        auth.uid(),
        auth.uid()
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

create or replace function public.seed_starter_decisions(p_project_id uuid)
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
        (
          'Grid vs Tetris Inventory',
          'grid-vs-tetris-inventory',
          'discussing',
          'We need an inventory system for crafting and loot.',
          'Should inventory use a simple grid or a tetris-style shape system?',
          E'- Grid: easier to scan and manage\n- Tetris: more tactile, supports item shapes\n- Hybrid: grid with oversized items',
          'Grid inventory with oversized items taking multiple cells',
          'Grid is faster to implement and clearer for players; oversized items still add variety.'
        )
    ) as t(title, slug, status, context, problem, options, selected_option, reasoning)
  loop
    if not exists (
      select 1 from public.decisions
      where project_id = p_project_id and slug = starter.slug
    ) then
      insert into public.decisions (
        workspace_id,
        project_id,
        title,
        slug,
        status,
        context,
        problem,
        options,
        selected_option,
        reasoning,
        created_by,
        owner_id
      )
      values (
        project.workspace_id,
        p_project_id,
        starter.title,
        starter.slug,
        starter.status::public.decision_status,
        starter.context,
        starter.problem,
        starter.options,
        starter.selected_option,
        starter.reasoning,
        auth.uid(),
        auth.uid()
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

alter table public.assets enable row level security;
alter table public.asset_task_links enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_links enable row level security;

create policy "Users can view project assets"
  on public.assets for select
  using (private.can_view_project(project_id));

create policy "Editors can manage assets"
  on public.assets for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view asset task links"
  on public.asset_task_links for select
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_task_links.asset_id
        and private.can_view_project(a.project_id)
    )
  );

create policy "Editors can manage asset task links"
  on public.asset_task_links for all
  using (
    exists (
      select 1 from public.assets a
      where a.id = asset_task_links.asset_id
        and private.can_edit_project(a.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.assets a
      where a.id = asset_task_links.asset_id
        and private.can_edit_project(a.project_id)
    )
  );

create policy "Users can view project decisions"
  on public.decisions for select
  using (private.can_view_project(project_id));

create policy "Editors can manage decisions"
  on public.decisions for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view decision links"
  on public.decision_links for select
  using (
    exists (
      select 1 from public.decisions d
      where d.id = decision_links.decision_id
        and private.can_view_project(d.project_id)
    )
  );

create policy "Editors can manage decision links"
  on public.decision_links for all
  using (
    exists (
      select 1 from public.decisions d
      where d.id = decision_links.decision_id
        and private.can_edit_project(d.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.decisions d
      where d.id = decision_links.decision_id
        and private.can_edit_project(d.project_id)
    )
  );
