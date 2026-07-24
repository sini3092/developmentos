-- Inbox as persistent chat: Souls reports (new each sync) + direct messages (one thread per peer)

create type public.inbox_thread_kind as enum ('souls_report', 'direct');

create table public.inbox_threads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  kind public.inbox_thread_kind not null,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  direct_peer_a uuid references auth.users (id) on delete cascade,
  direct_peer_b uuid references auth.users (id) on delete cascade,
  souls_report_number integer,
  metadata jsonb not null default '{}'::jsonb,
  last_message_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inbox_threads_direct_peers_check check (
    kind <> 'direct'
    or (direct_peer_a is not null and direct_peer_b is not null and direct_peer_a < direct_peer_b)
  ),
  constraint inbox_threads_souls_report_number_check check (
    kind <> 'souls_report' or souls_report_number is not null
  )
);

create unique index inbox_threads_direct_unique
  on public.inbox_threads (workspace_id, direct_peer_a, direct_peer_b)
  where kind = 'direct';

create index inbox_threads_workspace_last_message_idx
  on public.inbox_threads (workspace_id, last_message_at desc);

create index inbox_threads_project_souls_idx
  on public.inbox_threads (project_id, souls_report_number desc)
  where kind = 'souls_report';

create table public.inbox_thread_members (
  thread_id uuid not null references public.inbox_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index inbox_thread_members_user_idx
  on public.inbox_thread_members (user_id, thread_id);

create table public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inbox_threads (id) on delete cascade,
  sender_kind text not null check (sender_kind in ('user', 'souls', 'system', 'peer')),
  sender_user_id uuid references auth.users (id) on delete set null,
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'complete' check (status in ('pending', 'working', 'complete', 'error')),
  created_at timestamptz not null default now()
);

create index inbox_messages_thread_created_idx
  on public.inbox_messages (thread_id, created_at);

create trigger inbox_threads_set_updated_at
  before update on public.inbox_threads
  for each row execute function public.set_updated_at();

alter table public.inbox_threads enable row level security;
alter table public.inbox_thread_members enable row level security;
alter table public.inbox_messages enable row level security;

create or replace function private.is_inbox_thread_member(p_thread_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.inbox_thread_members m
    where m.thread_id = p_thread_id
      and m.user_id = auth.uid()
  );
$$;

create policy "Members can view inbox threads"
  on public.inbox_threads for select
  using (private.is_inbox_thread_member(id));

create policy "Members can update inbox threads"
  on public.inbox_threads for update
  using (private.is_inbox_thread_member(id))
  with check (private.is_inbox_thread_member(id));

create policy "Users can view own inbox memberships"
  on public.inbox_thread_members for select
  using (user_id = auth.uid());

create policy "Users can update own inbox memberships"
  on public.inbox_thread_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Members can view inbox messages"
  on public.inbox_messages for select
  using (private.is_inbox_thread_member(thread_id));

create policy "Members can send inbox messages"
  on public.inbox_messages for insert
  with check (
    private.is_inbox_thread_member(thread_id)
    and sender_kind = 'user'
    and sender_user_id = auth.uid()
  );

alter type public.notification_type add value if not exists 'inbox_direct';

grant execute on function private.is_inbox_thread_member(uuid) to authenticated;

create policy "Users can create direct inbox threads"
  on public.inbox_threads for insert
  with check (
    kind = 'direct'
    and private.is_workspace_member(workspace_id)
    and auth.uid() in (direct_peer_a, direct_peer_b)
  );

create policy "Users can join inbox threads"
  on public.inbox_thread_members for insert
  with check (user_id = auth.uid());

alter publication supabase_realtime add table public.inbox_messages;
