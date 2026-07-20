-- DevelopmentOS Phase 8: Project channels, design documents, and lore

create type public.document_status as enum (
  'draft',
  'in_review',
  'approved',
  'deprecated',
  'archived'
);

create type public.lore_entry_type as enum (
  'character',
  'faction',
  'location',
  'region',
  'settlement',
  'creature',
  'enemy',
  'deity',
  'historical_event',
  'culture',
  'religion',
  'item',
  'weapon',
  'artifact',
  'resource',
  'quest',
  'story_arc',
  'dialogue',
  'book_or_note',
  'magic_system',
  'language',
  'timeline_event',
  'other'
);

create type public.canon_status as enum (
  'concept',
  'draft',
  'review',
  'canon',
  'retconned',
  'archived'
);

create table public.project_channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  is_default boolean not null default false,
  position integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.project_channels (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  parent_message_id uuid references public.channel_messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.design_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null default 'gameplay_loops',
  summary text,
  content text not null default '',
  status public.document_status not null default 'draft',
  author_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.lore_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  entry_type public.lore_entry_type not null default 'other',
  summary text,
  content text not null default '',
  canon_status public.canon_status not null default 'draft',
  author_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, slug)
);

create index project_channels_project_id_idx on public.project_channels (project_id, position);
create index channel_messages_channel_id_idx on public.channel_messages (channel_id, created_at desc);
create index channel_messages_parent_idx on public.channel_messages (parent_message_id);
create index design_documents_project_id_idx on public.design_documents (project_id, updated_at desc);
create index lore_entries_project_id_idx on public.lore_entries (project_id, updated_at desc);

create trigger channel_messages_set_updated_at
  before update on public.channel_messages
  for each row execute function public.set_updated_at();

create trigger design_documents_set_updated_at
  before update on public.design_documents
  for each row execute function public.set_updated_at();

create trigger lore_entries_set_updated_at
  before update on public.lore_entries
  for each row execute function public.set_updated_at();

create or replace function public.seed_project_channels(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  project public.projects%rowtype;
  starter record;
  created_count integer := 0;
  position_counter integer := 0;
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
        ('General', 'general', 'Project-wide discussion', true),
        ('Gameplay', 'gameplay', 'Mechanics and player experience', false),
        ('Programming', 'programming', 'Engine and systems implementation', false),
        ('Art', 'art', 'Visual direction and assets', false),
        ('Narrative', 'narrative', 'Story, quests, and dialogue', false),
        ('Bugs', 'bugs', 'Bug reports and triage', false),
        ('Announcements', 'announcements', 'Important team updates', false)
    ) as t(name, slug, description, is_default)
  loop
    position_counter := position_counter + 1;
    if not exists (
      select 1 from public.project_channels
      where project_id = p_project_id and slug = starter.slug
    ) then
      insert into public.project_channels (
        workspace_id,
        project_id,
        name,
        slug,
        description,
        is_default,
        position,
        created_by
      )
      values (
        project.workspace_id,
        p_project_id,
        starter.name,
        starter.slug,
        starter.description,
        starter.is_default,
        position_counter,
        auth.uid()
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

create or replace function public.seed_starter_design_docs(p_project_id uuid)
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
        ('Core Pillars', 'core-pillars', 'game_vision', 'The three pillars that guide every design decision.'),
        ('Survival Loop', 'survival-loop', 'gameplay_loops', 'Health, stamina, hunger, thirst, and warmth systems.'),
        ('Tree Chopping', 'tree-chopping', 'gameplay_loops', 'Interaction, rewards, and feedback for harvesting wood.')
    ) as t(title, slug, category, summary)
  loop
    if not exists (
      select 1 from public.design_documents
      where project_id = p_project_id and slug = starter.slug
    ) then
      insert into public.design_documents (
        workspace_id,
        project_id,
        title,
        slug,
        category,
        summary,
        content,
        created_by,
        author_id
      )
      values (
        project.workspace_id,
        p_project_id,
        starter.title,
        starter.slug,
        starter.category,
        starter.summary,
        '# ' || starter.title || E'\n\n' || starter.summary,
        auth.uid(),
        auth.uid()
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

create or replace function public.seed_starter_lore_entries(p_project_id uuid)
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
        ('The Northern Kingdoms', 'northern-kingdoms', 'region', 'A cold frontier of fractured realms and ancient forests.'),
        ('Ironwood Trees', 'ironwood-trees', 'resource', 'Dense hardwood used for tools, structures, and fuel.'),
        ('The First Settlement', 'first-settlement', 'settlement', 'The player''s initial foothold in the wilderness.')
    ) as t(name, slug, entry_type, summary)
  loop
    if not exists (
      select 1 from public.lore_entries
      where project_id = p_project_id and slug = starter.slug
    ) then
      insert into public.lore_entries (
        workspace_id,
        project_id,
        name,
        slug,
        entry_type,
        summary,
        content,
        created_by,
        author_id
      )
      values (
        project.workspace_id,
        p_project_id,
        starter.name,
        starter.slug,
        starter.entry_type::public.lore_entry_type,
        starter.summary,
        '# ' || starter.name || E'\n\n' || starter.summary,
        auth.uid(),
        auth.uid()
      );
      created_count := created_count + 1;
    end if;
  end loop;

  return created_count;
end;
$$;

alter table public.project_channels enable row level security;
alter table public.channel_messages enable row level security;
alter table public.design_documents enable row level security;
alter table public.lore_entries enable row level security;

create policy "Users can view project channels"
  on public.project_channels for select
  using (private.can_view_project(project_id));

create policy "Editors can manage channels"
  on public.project_channels for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view channel messages"
  on public.channel_messages for select
  using (
    exists (
      select 1 from public.project_channels c
      where c.id = channel_messages.channel_id
        and private.can_view_project(c.project_id)
    )
  );

create policy "Editors can post channel messages"
  on public.channel_messages for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.project_channels c
      where c.id = channel_messages.channel_id
        and private.can_edit_project(c.project_id)
    )
  );

create policy "Authors can update their messages"
  on public.channel_messages for update
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "Users can view design documents"
  on public.design_documents for select
  using (private.can_view_project(project_id));

create policy "Editors can manage design documents"
  on public.design_documents for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

create policy "Users can view lore entries"
  on public.lore_entries for select
  using (private.can_view_project(project_id));

create policy "Editors can manage lore entries"
  on public.lore_entries for all
  using (private.can_edit_project(project_id))
  with check (private.can_edit_project(project_id));

grant execute on function public.seed_project_channels(uuid) to authenticated;
grant execute on function public.seed_starter_design_docs(uuid) to authenticated;
grant execute on function public.seed_starter_lore_entries(uuid) to authenticated;
