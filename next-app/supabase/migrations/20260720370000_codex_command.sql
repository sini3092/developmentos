alter table public.user_codex_settings
  add column if not exists codex_command text;
