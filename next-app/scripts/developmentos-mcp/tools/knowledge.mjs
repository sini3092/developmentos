import { object, string, enumString } from "../schema.mjs"
import { tool, projectSlug, id, limit } from "./shared.mjs"

export default [
  tool("developmentos_activity_list", "Read the project or workspace activity feed.", "activity.list", object({ projectSlug, limit })),
  tool("developmentos_design_wiki_list", "List game design wiki documents.", "design.list", object({ projectSlug }, ["projectSlug"])),
  tool("developmentos_design_wiki_upsert", "Create or update a game design wiki document.", "design.upsert", object({ projectSlug, documentId: id("Existing document ID"), title: string("Document title", { minLength: 1, maxLength: 200 }), category: string("Document category", { maxLength: 80 }), summary: string("Summary", { maxLength: 5000 }), content: string("Markdown/plain-text content", { maxLength: 100000 }), status: enumString("Document status", ["draft", "in_review", "approved", "deprecated", "archived"]) }, ["projectSlug", "title"])),
  tool("developmentos_lore_list", "List lore library entries.", "lore.list", object({ projectSlug }, ["projectSlug"])),
  tool("developmentos_lore_upsert", "Create or update a lore library entry.", "lore.upsert", object({ projectSlug, entryId: id("Existing entry ID"), name: string("Entry name", { minLength: 1, maxLength: 200 }), entryType: enumString("Lore type", ["character", "faction", "location", "region", "settlement", "creature", "enemy", "deity", "historical_event", "culture", "religion", "item", "weapon", "artifact", "resource", "quest", "story_arc", "dialogue", "book_or_note", "magic_system", "language", "timeline_event", "other"]), summary: string("Summary", { maxLength: 5000 }), content: string("Markdown/plain-text content", { maxLength: 100000 }), canonStatus: enumString("Canon status", ["concept", "draft", "review", "canon", "retconned", "archived"]) }, ["projectSlug", "name"])),
]
