-- DevelopmentOS Phase 2: Authentication, workspaces, and invitations

create extension if not exists pgcrypto;

create type public.workspace_role as enum (
  'owner',
  'project_lead',
  'team_member',
  'viewer'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'team_member',
  joined_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  role public.workspace_role not null default 'team_member',
  invited_by uuid references auth.users (id) on delete set null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);
create index workspace_members_workspace_id_idx on public.workspace_members (workspace_id);
create index workspace_invitations_token_idx on public.workspace_invitations (token);
create index workspace_invitations_email_idx on public.workspace_invitations (lower(email));

create schema if not exists private;

create or replace function private.is_workspace_member(ws_id uuid)
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
  );
$$;

create or replace function private.get_workspace_role(ws_id uuid)
returns public.workspace_role
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.workspace_members
  where workspace_id = ws_id
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function private.can_manage_workspace(ws_id uuid)
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_workspace_with_owner(ws_name text, ws_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (trim(ws_name), ws_slug, auth.uid())
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');

  return new_workspace_id;
end;
$$;

create or replace function public.accept_workspace_invitation(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.workspace_invitations%rowtype;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into user_email from auth.users where id = auth.uid();

  select * into invitation
  from public.workspace_invitations
  where token = invite_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired invitation';
  end if;

  if lower(invitation.email) <> lower(user_email) then
    raise exception 'Invitation email does not match your account';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invitation.workspace_id, auth.uid(), invitation.role)
  on conflict (workspace_id, user_id)
  do update set role = excluded.role;

  update public.workspace_invitations
  set accepted_at = now()
  where id = invitation.id;

  return invitation.workspace_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Workspace members can view teammate profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs
        on mine.workspace_id = theirs.workspace_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Members can view their workspaces"
  on public.workspaces for select
  using (private.is_workspace_member(id));

create policy "Authenticated users can create workspaces"
  on public.workspaces for insert
  with check (auth.uid() = created_by);

create policy "Owners can update workspaces"
  on public.workspaces for update
  using (private.get_workspace_role(id) = 'owner')
  with check (private.get_workspace_role(id) = 'owner');

create policy "Members can view workspace members"
  on public.workspace_members for select
  using (private.is_workspace_member(workspace_id));

create policy "Managers can invite members"
  on public.workspace_invitations for select
  using (private.can_manage_workspace(workspace_id));

create policy "Managers can create invitations"
  on public.workspace_invitations for insert
  with check (
    private.can_manage_workspace(workspace_id)
    and invited_by = auth.uid()
  );

create policy "Managers can delete pending invitations"
  on public.workspace_invitations for delete
  using (
    private.can_manage_workspace(workspace_id)
    and accepted_at is null
  );

grant usage on schema private to authenticated;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.get_workspace_role(uuid) to authenticated;
grant execute on function private.can_manage_workspace(uuid) to authenticated;
grant execute on function public.create_workspace_with_owner(text, text) to authenticated;
grant execute on function public.accept_workspace_invitation(text) to authenticated;

create or replace function public.get_invitation_preview(invite_token text)
returns table (
  email text,
  role public.workspace_role,
  workspace_name text,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.email,
    i.role,
    w.name,
    i.expires_at,
    i.accepted_at
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = invite_token;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;
