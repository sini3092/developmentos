import { LORE_CATEGORY_CARDS } from "@/lib/constants/lore-navigation"
import { SOULS_LORE_PLACEMENT_GUIDE } from "@/lib/agents/souls-lore-placement"
import { createClient } from "@/lib/supabase/server"

export async function buildSoulsLoreContext(projectId: string) {
  const supabase = await createClient()

  const [{ data: entries }, { data: collections }] = await Promise.all([
    supabase
      .from("lore_entries")
      .select("id, name, slug, entry_type, canon_status, summary, parent_entry_id, updated_at")
      .eq("project_id", projectId)
      .neq("canon_status", "archived")
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("lore_collections")
      .select("name, slug, description")
      .eq("project_id", projectId)
      .order("name")
      .limit(20),
  ])

  const entryById = new Map((entries ?? []).map((entry) => [entry.id, entry]))

  const byType = new Map<string, string[]>()
  for (const entry of entries ?? []) {
    const parent = entry.parent_entry_id ? entryById.get(entry.parent_entry_id) : null
    const parentHint = parent ? `, parent: ${parent.slug}` : ""
    const list = byType.get(entry.entry_type) ?? []
    list.push(`${entry.name} (${entry.slug}${parentHint})`)
    byType.set(entry.entry_type, list)
  }

  const typeLines = [...byType.entries()]
    .map(([type, names]) => `- ${type}: ${names.slice(0, 12).join(", ")}`)
    .join("\n")

  const collectionLines =
    collections?.map((item) => `- ${item.name} (${item.slug})`).join("\n") || "(none)"

  const categoryLines = LORE_CATEGORY_CARDS.map(
    (category) => `- ${category.label}: ${category.types.join(", ")}`
  ).join("\n")

  return [
    "## Lore library snapshot",
    typeLines || "(no lore entries yet)",
    "",
    "## Lore categories",
    categoryLines,
    "",
    "## Collections",
    collectionLines,
    "",
    "## Duplicate awareness",
    "Existing entries are matched by slug and similar names. lore.upsert merges duplicate text instead of creating copies.",
    SOULS_LORE_PLACEMENT_GUIDE,
  ].join("\n")
}
