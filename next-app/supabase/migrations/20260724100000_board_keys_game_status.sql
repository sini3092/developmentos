-- Multi-board list grouping + game status doc sync settings

alter table public.board_lists
  add column if not exists board_key text;

create index if not exists board_lists_project_board_key_idx
  on public.board_lists (project_id, board_key);

alter table public.projects
  add column if not exists game_status_path text not null default 'docs/GAME_STATUS.md',
  add column if not exists game_status_sync_enabled boolean not null default true;

comment on column public.board_lists.board_key is
  'Groups lists into logical boards: dev, systems, roadmap, bugs, lore';

comment on column public.projects.game_status_path is
  'Path in the linked GitHub repo to the living game status markdown file.';
