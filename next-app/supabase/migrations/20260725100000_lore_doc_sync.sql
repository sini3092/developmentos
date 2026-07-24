alter table public.projects
  add column if not exists lore_doc_path text not null default 'docs/loredoc.md',
  add column if not exists lore_doc_sync_enabled boolean not null default true;

comment on column public.projects.lore_doc_path is
  'Path in the linked GitHub repo for Souls-maintained lore export (coding AI reads this).';

comment on column public.projects.lore_doc_sync_enabled is
  'When true, Souls exports DevelopmentOS lore to lore_doc_path and can update GAME_STATUS gaps.';
