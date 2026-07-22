-- Lore Phase 4: Collaboration (comments, review requests, change summaries)

create type public.lore_comment_status as enum ('open', 'resolved');

create type public.lore_review_status as enum (
  'pending',
  'approved',
  'changes_requested',
  'cancelled'
);

create table public.lore_comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lore_entries (id) on delete cascade,
  section_id uuid references public.lore_sections (id) on delete cascade,
  parent_comment_id uuid references public.lore_comments (id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 10000),
  status public.lore_comment_status not null default 'open',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz
);

create index lore_comments_entry_id_idx on public.lore_comments (entry_id, created_at desc);
create index lore_comments_section_id_idx on public.lore_comments (section_id)
  where section_id is not null;

create table public.lore_review_requests (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.lore_entries (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  message text,
  status public.lore_review_status not null default 'pending',
  resolved_by uuid references auth.users (id) on delete set null,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index lore_review_requests_pending_entry_idx
  on public.lore_review_requests (entry_id)
  where status = 'pending';

create index lore_review_requests_entry_id_idx
  on public.lore_review_requests (entry_id, created_at desc);

alter table public.lore_entries
  add column if not exists change_summary text;

alter table public.lore_entry_versions
  add column if not exists change_summary text;

alter type public.notification_type add value if not exists 'lore_review_requested';
alter type public.notification_type add value if not exists 'lore_comment';
alter type public.notification_type add value if not exists 'lore_review_resolved';

create trigger lore_comments_set_updated_at
  before update on public.lore_comments
  for each row execute function public.set_updated_at();

alter table public.lore_comments enable row level security;
alter table public.lore_review_requests enable row level security;

create policy "Users can view lore comments"
  on public.lore_comments for select
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_comments.entry_id
        and private.can_view_project(e.project_id)
    )
  );

create policy "Editors can insert lore comments"
  on public.lore_comments for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.lore_entries e
      where e.id = lore_comments.entry_id
        and private.can_edit_project(e.project_id)
    )
  );

create policy "Editors can update lore comments"
  on public.lore_comments for update
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_comments.entry_id
        and private.can_edit_project(e.project_id)
    )
  );

create policy "Editors can delete own lore comments"
  on public.lore_comments for delete
  using (
    created_by = auth.uid()
    and exists (
      select 1 from public.lore_entries e
      where e.id = lore_comments.entry_id
        and private.can_edit_project(e.project_id)
    )
  );

create policy "Users can view lore review requests"
  on public.lore_review_requests for select
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_review_requests.entry_id
        and private.can_view_project(e.project_id)
    )
  );

create policy "Editors can insert lore review requests"
  on public.lore_review_requests for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1 from public.lore_entries e
      where e.id = lore_review_requests.entry_id
        and private.can_edit_project(e.project_id)
    )
  );

create policy "Editors can update lore review requests"
  on public.lore_review_requests for update
  using (
    exists (
      select 1 from public.lore_entries e
      where e.id = lore_review_requests.entry_id
        and private.can_edit_project(e.project_id)
    )
  );

create or replace function public.notify_lore_mention(
  p_workspace_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_entry_id uuid,
  p_comment_id uuid
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
    'mentioned'::public.notification_type,
    p_title,
    p_body,
    p_link,
    'lore_comment',
    p_comment_id
  );
end;
$$;

create or replace function public.notify_lore_review_requested(
  p_workspace_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_entry_id uuid,
  p_review_id uuid
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
    'lore_review_requested'::public.notification_type,
    p_title,
    p_body,
    p_link,
    'lore_review_request',
    p_review_id
  );
end;
$$;

create or replace function public.notify_lore_review_resolved(
  p_workspace_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text,
  p_link text,
  p_entry_id uuid,
  p_review_id uuid
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
    'lore_review_resolved'::public.notification_type,
    p_title,
    p_body,
    p_link,
    'lore_review_request',
    p_review_id
  );
end;
$$;

grant execute on function public.notify_lore_mention(uuid, uuid, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.notify_lore_review_requested(uuid, uuid, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.notify_lore_review_resolved(uuid, uuid, text, text, text, uuid, uuid) to authenticated;
