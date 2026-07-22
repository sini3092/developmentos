-- Long-term memory for private Souls conversations (compacted history)

alter table public.souls_private_conversations
  add column if not exists memory_summary text,
  add column if not exists compacted_through_message_id uuid references public.souls_private_messages (id) on delete set null,
  add column if not exists compacted_at timestamptz;

create index souls_private_conversations_compacted_idx
  on public.souls_private_conversations (compacted_through_message_id)
  where compacted_through_message_id is not null;
