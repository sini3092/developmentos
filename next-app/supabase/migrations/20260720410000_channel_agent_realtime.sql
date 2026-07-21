-- Realtime updates for channel messages and personal agent jobs.
alter publication supabase_realtime add table public.channel_messages;
alter publication supabase_realtime add table public.agent_jobs;
