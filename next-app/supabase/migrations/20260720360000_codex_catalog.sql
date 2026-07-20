alter table public.user_codex_settings
  add column if not exists discovered_workspaces text[] not null default '{}',
  add column if not exists discovered_models text[] not null default '{}',
  add column if not exists catalog_updated_at timestamptz;
