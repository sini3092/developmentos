import { createClient } from "@/lib/supabase/server"

export type TaskLinkOption = {
  id: string
  label: string
  slug: string
}

export type TaskDependencyOption = {
  id: string
  label: string
}

export type ProjectTaskLinkOptions = {
  assets: TaskLinkOption[]
  decisions: TaskLinkOption[]
  designDocuments: TaskLinkOption[]
  loreEntries: TaskLinkOption[]
  tasks: TaskDependencyOption[]
}

export async function getProjectTaskLinkOptions(
  projectId: string
): Promise<ProjectTaskLinkOptions> {
  const supabase = await createClient()

  const [{ data: assets }, { data: decisions }, { data: designDocuments }, { data: loreEntries }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("assets")
        .select("id, name, slug")
        .eq("project_id", projectId)
        .order("name", { ascending: true }),
      supabase
        .from("decisions")
        .select("id, title, slug")
        .eq("project_id", projectId)
        .order("title", { ascending: true }),
      supabase
        .from("design_documents")
        .select("id, title, slug")
        .eq("project_id", projectId)
        .order("title", { ascending: true }),
      supabase
        .from("lore_entries")
        .select("id, name, slug")
        .eq("project_id", projectId)
        .order("name", { ascending: true }),
      supabase
        .from("tasks")
        .select("id, identifier, title")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("identifier", { ascending: true }),
    ])

  return {
    assets:
      assets?.map((asset) => ({
        id: asset.id,
        label: asset.name,
        slug: asset.slug,
      })) ?? [],
    decisions:
      decisions?.map((decision) => ({
        id: decision.id,
        label: decision.title,
        slug: decision.slug,
      })) ?? [],
    designDocuments:
      designDocuments?.map((document) => ({
        id: document.id,
        label: document.title,
        slug: document.slug,
      })) ?? [],
    loreEntries:
      loreEntries?.map((entry) => ({
        id: entry.id,
        label: entry.name,
        slug: entry.slug,
      })) ?? [],
    tasks:
      tasks?.map((task) => ({
        id: task.id,
        label: `${task.identifier} · ${task.title}`,
      })) ?? [],
  }
}
