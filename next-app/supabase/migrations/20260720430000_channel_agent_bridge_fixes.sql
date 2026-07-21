-- Ensure bridge API can post agent replies and realtime is enabled.
grant execute on function public.post_agent_channel_message(uuid, text, text, uuid) to service_role;

do $$
begin
  alter publication supabase_realtime add table public.channel_messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.agent_jobs;
exception
  when duplicate_object then null;
end $$;
