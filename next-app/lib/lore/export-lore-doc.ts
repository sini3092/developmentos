import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { getLoreSectionsForEntry } from "@/lib/lore/sections"

type Client = SupabaseClient<Database>

export function loreDocHeader(projectName: string) {
  return [
    `# ${projectName} — Lore Document`,
    "",
    "> **For coding AIs:** Read this file when you need world lore, factions, regions, systems, or narrative context.",
    "> **Maintained by Souls** from the DevelopmentOS lore library. Do not treat task checklists here — use `docs/GAME_STATUS.md` for production status.",
    "",
    `_Last synced by Souls: ${new Date().toISOString()}_`,
    "",
    "---",
    "",
  ].join("\n")
}

export async function buildLoreDocMarkdown(
  supabase: Client,
  projectId: string,
  projectName: string
) {
  const { data: entries } = await supabase
    .from("lore_entries")
    .select("id, name, slug, entry_type, canon_status, summary, content, updated_at")
    .eq("project_id", projectId)
    .neq("canon_status", "archived")
    .order("entry_type")
    .order("name")

  const lines = [loreDocHeader(projectName)]

  if (!entries?.length) {
    lines.push(
      "_No lore entries in DevelopmentOS yet. Souls will populate this document when lore is added in the app._",
      ""
    )
    return lines.join("\n")
  }

  let currentType: string | null = null

  for (const entry of entries) {
    if (entry.entry_type !== currentType) {
      currentType = entry.entry_type
      lines.push(`# ${entry.entry_type.replace(/_/g, " ")}`, "")
    }

    lines.push(`## ${entry.name}`, "")
    lines.push(
      `**Type:** ${entry.entry_type} · **Canon:** ${entry.canon_status} · **Slug:** \`${entry.slug}\``
    )
    lines.push("")

    if (entry.summary?.trim()) {
      lines.push(entry.summary.trim())
      lines.push("")
    }

    const sections = await getLoreSectionsForEntry(supabase, entry.id)
    const sectionContent = sections.filter((section) => section.content?.trim())

    if (sectionContent.length > 0) {
      for (const section of sectionContent) {
        const title = section.title ?? section.section_key.replace(/_/g, " ")
        lines.push(`### ${title}`, "")
        lines.push(section.content.trim())
        lines.push("")
      }
    } else if (entry.content?.trim()) {
      lines.push(entry.content.trim())
      lines.push("")
    }

    lines.push("---", "")
  }

  return lines.join("\n").trimEnd() + "\n"
}
