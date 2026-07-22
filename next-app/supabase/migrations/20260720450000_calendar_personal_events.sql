-- Personal calendar events with day-of reminders

alter type public.notification_type add value if not exists 'calendar_reminder';

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  event_date date not null,
  notify_on_day boolean not null default true,
  reminded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_workspace_user_date_idx
  on public.calendar_events (workspace_id, user_id, event_date);

create index calendar_events_pending_reminders_idx
  on public.calendar_events (event_date)
  where notify_on_day = true and reminded_at is null;

create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

create policy "Users read own calendar events"
  on public.calendar_events for select
  using (
    user_id = auth.uid()
    and private.is_workspace_member(workspace_id)
  );

create policy "Users create own calendar events"
  on public.calendar_events for insert
  with check (
    user_id = auth.uid()
    and private.is_workspace_member(workspace_id)
  );

create policy "Users update own calendar events"
  on public.calendar_events for update
  using (
    user_id = auth.uid()
    and private.is_workspace_member(workspace_id)
  )
  with check (
    user_id = auth.uid()
    and private.is_workspace_member(workspace_id)
  );

create policy "Users delete own calendar events"
  on public.calendar_events for delete
  using (
    user_id = auth.uid()
    and private.is_workspace_member(workspace_id)
  );

alter table public.notification_preferences
  add column if not exists push_calendar_reminder boolean not null default true;
