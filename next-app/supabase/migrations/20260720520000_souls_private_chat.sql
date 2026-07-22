-- Private Souls chat: per-user conversations invisible to teammates

create type public.souls_message_role as enum ('user', 'assistant', 'system');
create type public.souls_message_status as enum ('pending', 'working', 'complete', 'error');

create table public.souls_private_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Souls',
  context_type text,
  context_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, project_id)
);

create index souls_private_conversations_user_idx
  on public.souls_private_conversations (user_id, updated_at desc);

create table public.souls_private_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.souls_private_conversations (id) on delete cascade,
  role public.souls_message_role not null,
  body text not null default '',
  status public.souls_message_status not null default 'complete',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index souls_private_messages_conversation_idx
  on public.souls_private_messages (conversation_id, created_at);

create trigger souls_private_conversations_set_updated_at
  before update on public.souls_private_conversations
  for each row execute function public.set_updated_at();

alter table public.souls_private_conversations enable row level security;
alter table public.souls_private_messages enable row level security;

create policy "Users can view own souls conversations"
  on public.souls_private_conversations for select
  using (user_id = auth.uid());

create policy "Users can manage own souls conversations"
  on public.souls_private_conversations for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can view own souls messages"
  on public.souls_private_messages for select
  using (
    exists (
      select 1 from public.souls_private_conversations c
      where c.id = souls_private_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can manage own souls messages"
  on public.souls_private_messages for all
  using (
    exists (
      select 1 from public.souls_private_conversations c
      where c.id = souls_private_messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.souls_private_conversations c
      where c.id = souls_private_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.souls_private_messages;
