import { createClient } from "@/lib/supabase/server"

export async function buildSoulsLoreContext(projectId: string) {
  const supabase = await createClient()

  const [{ data: entries }, { data: collections }] = await Promise.all([
    supabase
      .from("lore_entries")
      .select("name, slug, entry_type, canon_status, summary, updated_at")
      .eq("project_id", projectId)
      .neq("canon_status", "archived")
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("lore_collections")
      .select("name, slug, description")
      .eq("project_id", projectId)
      .order("name")
      .limit(20),
  ])

  const byType = new Map<string, string[]>()
  for (const entry of entries ?? []) {
    const list = byType.get(entry.entry_type) ?? []
    list.push(`${entry.name} (${entry.slug})`)
    byType.set(entry.entry_type, list)
  }

  const typeLines = [...byType.entries()]
    .map(([type, names]) => `- ${type}: ${names.slice(0, 8).join(", ")}`)
    .join("\n")

  const collectionLines =
    collections?.map((item) => `- ${item.name}`).join("\n") || "(none)"

  return [
    "## Lore library snapshot",
    typeLines || "(no lore entries yet)",
    "",
    "## Collections",
    collectionLines,
  ].join("\n")
}
