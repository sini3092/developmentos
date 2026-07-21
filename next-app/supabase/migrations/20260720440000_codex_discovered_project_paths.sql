alter table public.user_codex_settings
  add column if not exists discovered_project_paths text[] not null default '{}';
