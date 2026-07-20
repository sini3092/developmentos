-- DevelopmentOS Phase 12: Channel threads, reactions, mentions, message-to-task

alter type public.notification_type add value if not exists 'mentioned';

alter table public.channel_messages
  add column if not exists linked_task_id uuid references public.tasks (id) on delete set null;

create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.channel_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index message_reactions_message_id_idx
  on public.message_reactions (message_id);

create index channel_messages_linked_task_idx
  on public.channel_messages (linked_task_id)
  where linked_task_id is not null;

create or replace function public.notify_channel_mention(
  p_workspace_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text default null,
  p_link text default null,
  p_message_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform private.create_notification(
    p_workspace_id,
    p_user_id,
    'mentioned',
    p_title,
    p_body,
    p_link,
    'channel_message',
    p_message_id
  );
end;
$$;

grant execute on function public.notify_channel_mention(uuid, uuid, text, text, text, uuid) to authenticated;

alter table public.message_reactions enable row level security;

create policy "Users can view message reactions"
  on public.message_reactions for select
  using (
    exists (
      select 1
      from public.channel_messages m
      join public.project_channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
        and private.can_view_project(c.project_id)
    )
  );

create policy "Editors can manage message reactions"
  on public.message_reactions for all
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.channel_messages m
      join public.project_channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
        and private.can_edit_project(c.project_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.channel_messages m
      join public.project_channels c on c.id = m.channel_id
      where m.id = message_reactions.message_id
        and private.can_edit_project(c.project_id)
    )
  );
