-- Auto roadmap rollup from tasks + AI agents (@souls / @personal) + OpenRouter workspace keys.

-- ---------------------------------------------------------------------------
-- Roadmap auto-sync
-- ---------------------------------------------------------------------------

create or replace function public.sync_milestone_from_tasks(p_milestone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_done integer;
  v_avg integer;
  v_blocked integer;
  v_active integer;
begin
  if p_milestone_id is null then
    return;
  end if;

  select
    count(*),
    count(*) filter (where status = 'done'),
    coalesce(round(avg(progress)), 0)::integer,
    count(*) filter (where status = 'blocked'),
    count(*) filter (where status in ('in_progress', 'in_review', 'ready'))
  into v_total, v_done, v_avg, v_blocked, v_active
  from public.tasks
  where milestone_id = p_milestone_id
    and deleted_at is null
    and status <> 'cancelled';

  if v_total = 0 then
    return;
  end if;

  update public.milestones
  set
    progress = v_avg,
    status = case
      when v_done = v_total then 'completed'
      when v_done > 0 or v_active > 0 then 'active'
      else status
    end,
    health = case
      when v_blocked > 0 then 'at_risk'
      else health
    end,
    updated_at = now()
  where id = p_milestone_id;
end;
$$;

create or replace function public.sync_initiative_from_tasks(p_initiative_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_done integer;
  v_avg integer;
  v_blocked integer;
  v_active integer;
begin
  if p_initiative_id is null then
    return;
  end if;

  select
    count(*),
    count(*) filter (where status = 'done'),
    coalesce(round(avg(progress)), 0)::integer,
    count(*) filter (where status = 'blocked'),
    count(*) filter (where status in ('in_progress', 'in_review', 'ready'))
  into v_total, v_done, v_avg, v_blocked, v_active
  from public.tasks
  where initiative_id = p_initiative_id
    and deleted_at is null
    and status <> 'cancelled';

  if v_total = 0 then
    return;
  end if;

  update public.initiatives
  set
    progress = v_avg,
    status = case
      when v_done = v_total then 'completed'
      when v_done > 0 or v_active > 0 then 'active'
      when status = 'planned' then 'active'
      else status
    end,
    health = case
      when v_blocked > 0 then 'at_risk'
      when v_done::numeric / v_total::numeric < 0.35 and v_active = 0 and v_done > 0 then 'at_risk'
      when v_done = v_total then 'on_track'
      else health
    end,
    updated_at = now()
  where id = p_initiative_id;
end;
$$;

create or replace function public.on_task_roadmap_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_milestone_from_tasks(old.milestone_id);
    perform public.sync_initiative_from_tasks(old.initiative_id);
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.milestone_id is distinct from new.milestone_id then
      perform public.sync_milestone_from_tasks(old.milestone_id);
    end if;
    if old.initiative_id is distinct from new.initiative_id then
      perform public.sync_initiative_from_tasks(old.initiative_id);
    end if;
  end if;

  perform public.sync_milestone_from_tasks(new.milestone_id);
  perform public.sync_initiative_from_tasks(new.initiative_id);
  return new;
end;
$$;

drop trigger if exists tasks_roadmap_rollup on public.tasks;

create trigger tasks_roadmap_rollup
after insert or update of status, progress, initiative_id, milestone_id, deleted_at
or delete on public.tasks
for each row
execute function public.on_task_roadmap_rollup();

do $$
declare
  r record;
begin
  for r in select id from public.milestones loop
    perform public.sync_milestone_from_tasks(r.id);
  end loop;
  for r in select id from public.initiatives loop
    perform public.sync_initiative_from_tasks(r.id);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Workspace OpenRouter settings
-- ---------------------------------------------------------------------------

alter table public.workspaces
  add column if not exists openrouter_api_key text,
  add column if not exists openrouter_model text not null default 'google/gemini-2.0-flash-001';

-- ---------------------------------------------------------------------------
-- Agent messages + jobs
-- ---------------------------------------------------------------------------

alter table public.channel_messages
  alter column author_id drop not null;

alter table public.channel_messages
  add column if not exists agent_name text;

alter table public.channel_messages
  drop constraint if exists channel_messages_agent_name_check;

alter table public.channel_messages
  add constraint channel_messages_agent_name_check
  check (agent_name is null or agent_name in ('souls', 'personal'));

alter table public.channel_messages
  drop constraint if exists channel_messages_author_or_agent_check;

alter table public.channel_messages
  add constraint channel_messages_author_or_agent_check
  check (
    (author_id is not null and agent_name is null)
    or (author_id is null and agent_name is not null)
  );

create table if not exists public.user_bridge_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  label text not null default 'Codex bridge',
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_bridge_tokens_user_id_idx
  on public.user_bridge_tokens (user_id);

alter table public.user_bridge_tokens enable row level security;

create policy user_bridge_tokens_select_own
  on public.user_bridge_tokens for select
  using (user_id = auth.uid());

create policy user_bridge_tokens_insert_own
  on public.user_bridge_tokens for insert
  with check (user_id = auth.uid());

create policy user_bridge_tokens_delete_own
  on public.user_bridge_tokens for delete
  using (user_id = auth.uid());

create table if not exists public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  channel_id uuid not null references public.project_channels (id) on delete cascade,
  trigger_message_id uuid not null references public.channel_messages (id) on delete cascade,
  agent_name text not null check (agent_name in ('souls', 'personal')),
  status text not null default 'pending' check (
    status in ('pending', 'running', 'awaiting_approval', 'completed', 'failed')
  ),
  prompt text not null,
  result text,
  error text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_jobs_personal_pending_idx
  on public.agent_jobs (created_by, status)
  where agent_name = 'personal' and status in ('pending', 'awaiting_approval');

alter table public.agent_jobs enable row level security;

create policy agent_jobs_select_own_or_workspace
  on public.agent_jobs for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = agent_jobs.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'project_lead')
    )
  );

create policy agent_jobs_insert_own
  on public.agent_jobs for insert
  with check (created_by = auth.uid());

create policy agent_jobs_update_own
  on public.agent_jobs for update
  using (created_by = auth.uid());

create or replace function public.post_agent_channel_message(
  p_channel_id uuid,
  p_body text,
  p_agent_name text,
  p_parent_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  if p_agent_name not in ('souls', 'personal') then
    raise exception 'Invalid agent name';
  end if;

  insert into public.channel_messages (channel_id, author_id, body, parent_message_id, agent_name)
  values (p_channel_id, null, trim(p_body), p_parent_message_id, p_agent_name)
  returning id into v_message_id;

  return v_message_id;
end;
$$;

grant execute on function public.post_agent_channel_message(uuid, text, text, uuid) to authenticated;
grant execute on function public.sync_milestone_from_tasks(uuid) to authenticated;
grant execute on function public.sync_initiative_from_tasks(uuid) to authenticated;
