-- DevelopmentOS Phase 10: Optional GitHub repository link on projects

alter table public.projects
  add column if not exists github_repo_url text,
  add column if not exists github_owner text,
  add column if not exists github_repo_name text;

alter table public.projects
  add constraint projects_github_repo_url_format
  check (
    github_repo_url is null
    or github_repo_url ~ '^https://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+/?$'
  );

create or replace function public.create_project_with_owner(
  ws_id uuid,
  project_name text,
  project_slug text,
  project_description text default null,
  project_color text default 'blue',
  project_visibility public.project_visibility default 'workspace',
  project_github_repo_url text default null,
  project_github_owner text default null,
  project_github_repo_name text default null
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
    created_by,
    github_repo_url,
    github_owner,
    github_repo_name
  )
  values (
    ws_id,
    trim(project_name),
    project_slug,
    nullif(trim(project_description), ''),
    project_color,
    project_visibility,
    auth.uid(),
    nullif(trim(project_github_repo_url), ''),
    nullif(trim(project_github_owner), ''),
    nullif(trim(project_github_repo_name), '')
  )
  returning id into new_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (new_project_id, auth.uid(), 'owner');

  return new_project_id;
end;
$$;

grant execute on function public.create_project_with_owner(
  uuid,
  text,
  text,
  text,
  text,
  public.project_visibility,
  text,
  text,
  text
) to authenticated;
