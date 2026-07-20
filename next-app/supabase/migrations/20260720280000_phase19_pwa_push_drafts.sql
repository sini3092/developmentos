-- DevelopmentOS Phase 19: Web push subscriptions, notification preferences, push queue

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default true,
  push_task_assigned boolean not null default true,
  push_task_comment boolean not null default true,
  push_task_blocked boolean not null default true,
  push_roadmap_update boolean not null default false,
  push_mentioned boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_notification_queue (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (notification_id)
);

create index push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index push_notification_queue_pending_idx
  on public.push_notification_queue (created_at)
  where delivered_at is null;

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create or replace function private.enqueue_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_notification_queue (notification_id)
  values (NEW.id)
  on conflict (notification_id) do nothing;
  return NEW;
end;
$$;

create trigger notifications_enqueue_push
  after insert on public.notifications
  for each row execute function private.enqueue_push_notification();

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.notification_preferences enable row level security;

create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.push_notification_queue enable row level security;
