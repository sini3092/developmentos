-- Align roadmap rollups with checklist progress instead of legacy task status.

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
  v_active integer;
begin
  if p_milestone_id is null then
    return;
  end if;

  select
    count(*),
    count(*) filter (where progress >= 100),
    coalesce(round(avg(progress)), 0)::integer,
    count(*) filter (where progress > 0 and progress < 100)
  into v_total, v_done, v_avg, v_active
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
  v_active integer;
begin
  if p_initiative_id is null then
    return;
  end if;

  select
    count(*),
    count(*) filter (where progress >= 100),
    coalesce(round(avg(progress)), 0)::integer,
    count(*) filter (where progress > 0 and progress < 100)
  into v_total, v_done, v_avg, v_active
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
    updated_at = now()
  where id = p_initiative_id;
end;
$$;
