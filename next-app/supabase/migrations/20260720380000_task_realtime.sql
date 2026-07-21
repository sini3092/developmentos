-- Enable Supabase Realtime for collaborative kanban updates.
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.task_checklist_items;
