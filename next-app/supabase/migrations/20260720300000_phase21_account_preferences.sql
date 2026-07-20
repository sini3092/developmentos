-- DevelopmentOS Phase 21: Account theme and density preferences on profiles

create type public.theme_preference as enum (
  'light',
  'dark',
  'system'
);

create type public.density_preference as enum (
  'comfortable',
  'compact'
);

alter table public.profiles
  add column if not exists theme_preference public.theme_preference not null default 'system',
  add column if not exists density_preference public.density_preference not null default 'comfortable';
