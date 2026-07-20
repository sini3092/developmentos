-- Per-user Codex preferences for @personal bridge (profile, model, workspace path).

create table if not exists public.user_codex_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  codex_profile text,
  codex_model text,
  codex_workspace_path text,
  session_mode text not null default 'new' check (session_mode in ('new', 'resume_last')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_codex_settings enable row level security;

create policy user_codex_settings_select_own
  on public.user_codex_settings for select
  using (user_id = auth.uid());

create policy user_codex_settings_insert_own
  on public.user_codex_settings for insert
  with check (user_id = auth.uid());

create policy user_codex_settings_update_own
  on public.user_codex_settings for update
  using (user_id = auth.uid());

alter table public.agent_jobs
  add column if not exists codex_session_id text;
