import { buildSoulsLoreContext } from "@/lib/agents/souls-lore-context"
import { dedupeAgentActions } from "@/lib/agents/souls-lore-dedup"
import { executeSoulsLoreTool } from "@/lib/agents/souls-lore-tools"
import {
  GAME_STATUS_LORE_MAX_ACTIONS_PER_ROUND,
  GAME_STATUS_LORE_MAX_ROUNDS,
  SOULS_GAME_STATUS_LORE_SYSTEM_PROMPT,
} from "@/lib/agents/souls-game-status-lore-prompt"
import { parseGameStatusDocument } from "@/lib/imports/game-status-parser"
import { isLoreStub } from "@/lib/lore/stub-detection"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveProjectCommentAuthor } from "@/lib/tasks/souls-board-helpers"

const LORE_CATEGORIES = new Set([
  "quests & narrative",
  "rekindled & npcs",
  "world & environment",
  "combat & progression",
  "building & settlement",
])

type AgentResponse = {
  reply?: string
  done?: boolean
  actions?: Array<{ tool: string; label: string; input: Record<string, unknown> }>
}

const LORE_TOOLS = new Set([
  "lore.list",
  "lore.upsert",
  "lore.section.upsert",
  "lore.relationship",
  "lore.collection.create",
  "lore.collection.add",
])

function parseAgentResponse(raw: string): AgentResponse {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { reply: trimmed, done: true, actions: [] }
  }

  try {
    return JSON.parse(jsonMatch[0]) as AgentResponse
  } catch {
    return { reply: trimmed, done: true, actions: [] }
  }
}

function extractLoreContextFromGameStatus(markdown: string) {
  const document = parseGameStatusDocument(markdown)
  const relevant = document.sections.filter((section) => {
    const category = section.category?.trim().toLowerCase() ?? ""
    if (LORE_CATEGORIES.has(category)) {
      return true
    }
    return /rekindl|lore|narrative|region|character|faction|world|soul|hearth|corruption|quest/i.test(
      section.title
    )
  })

  return relevant.slice(0, 40).map((section) => ({
    title: section.title,
    category: section.category,
    status: section.statusLine ?? null,
    comments: section.comments,
    checkboxes: section.checkboxes.map((item) => item.line),
  }))
}

function capLoreActions(actions: AgentResponse["actions"]) {
  const loreOnly = (actions ?? []).filter((action) => LORE_TOOLS.has(action.tool))
  return dedupeAgentActions(loreOnly).slice(0, GAME_STATUS_LORE_MAX_ACTIONS_PER_ROUND)
}

function summarizeResults(results: SoulsActionResult[]) {
  return results
    .map((result) => {
      const slug =
        result.after && typeof result.after === "object" && "slug" in result.after
          ? String(result.after.slug)
          : null
      const status = result.status === "success" ? "ok" : "failed"
      return `- [${status}] ${result.summary ?? result.label}${slug ? ` (${slug})` : ""}`
    })
    .join("\n")
}

export type GameStatusLoreEnrichmentResult = {
  skipped: boolean
  reason?: string
  rounds: number
  entriesEnriched: number
  actions: SoulsActionResult[]
  summary?: string
}

export async function runSoulsGameStatusLoreEnrichment(input: {
  projectId: string
  projectSlug: string
  workspaceId: string
  gameStatusMarkdown: string
  statusPath: string
  branch: string
  commitSha: string
}) {
  const supabase = createAdminClient()

  const { data: entries } = await supabase
    .from("lore_entries")
    .select("id, name, slug, entry_type, summary, content, canon_status")
    .eq("project_id", input.projectId)
    .neq("canon_status", "archived")
    .order("name")

  const stubs = (entries ?? []).filter((entry) => isLoreStub(entry))
  if (stubs.length === 0) {
    return {
      skipped: true,
      reason: "No thin lore stubs to enrich.",
      rounds: 0,
      entriesEnriched: 0,
      actions: [],
    } satisfies GameStatusLoreEnrichmentResult
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("openrouter_api_key, openrouter_model")
    .eq("id", input.workspaceId)
    .maybeSingle()

  if (!workspace?.openrouter_api_key) {
    return {
      skipped: true,
      reason: "OpenRouter not configured.",
      rounds: 0,
      entriesEnriched: 0,
      actions: [],
    } satisfies GameStatusLoreEnrichmentResult
  }

  const userId = await resolveProjectCommentAuthor(supabase, input.projectId)
  if (!userId) {
    return {
      skipped: true,
      reason: "No project member for lore authorship.",
      rounds: 0,
      entriesEnriched: 0,
      actions: [],
    } satisfies GameStatusLoreEnrichmentResult
  }

  const loreContext = await buildSoulsLoreContext(input.projectId)
  const gameStatusLore = extractLoreContextFromGameStatus(input.gameStatusMarkdown)
  const stubList = stubs.slice(0, 24).map((entry) => ({
    name: entry.name,
    slug: entry.slug,
    entryType: entry.entry_type,
    summary: entry.summary,
    contentLength: entry.content?.length ?? 0,
  }))

  const basePrompt = [
    "## Automated GAME_STATUS lore enrichment",
    `Branch: ${input.branch}`,
    `Commit: ${input.commitSha}`,
    `GAME_STATUS path: ${input.statusPath}`,
    "",
    "## Thin lore entries to enrich (priority)",
    JSON.stringify(stubList, null, 2),
    "",
    "## Narrative sections from GAME_STATUS.md",
    JSON.stringify(gameStatusLore, null, 2),
    "",
    "Enrich stub entries with substantive lore. Tasks were already synced — lore tools only.",
  ].join("\n")

  const model = workspace.openrouter_model ?? "google/gemini-2.0-flash-001"
  const allResults: SoulsActionResult[] = []
  const replyParts: string[] = []
  let round = 0
  let done = false
  let idleRounds = 0

  while (!done && round < GAME_STATUS_LORE_MAX_ROUNDS) {
    round += 1

    const continuation =
      round > 1
        ? [
            "",
            `## Continuation round ${round}/${GAME_STATUS_LORE_MAX_ROUNDS}`,
            "Completed actions:",
            summarizeResults(allResults) || "(none yet)",
            "",
            "Continue enriching remaining stubs. lore.upsert with sections[] required.",
            "Do not repeat successful upserts.",
          ].join("\n")
        : ""

    const raw = await chatWithOpenRouter({
      apiKey: workspace.openrouter_api_key,
      model,
      maxTokens: 8000,
      temperature: 0.35,
      messages: [
        { role: "system", content: SOULS_GAME_STATUS_LORE_SYSTEM_PROMPT },
        { role: "user", content: [loreContext, basePrompt, continuation].join("\n") },
      ],
    })

    const parsed = parseAgentResponse(raw)
    if (parsed.reply) {
      replyParts.push(parsed.reply)
    }

    const roundActions = capLoreActions(parsed.actions)
    if (roundActions.length > 0) {
      idleRounds = 0
      for (const action of roundActions) {
        const result = await executeSoulsLoreTool({
          tool: action.tool,
          label: action.label,
          toolInput: action.input ?? {},
          projectId: input.projectId,
          projectSlug: input.projectSlug,
          workspaceId: input.workspaceId,
          userId,
          supabase,
        })
        if (result) {
          allResults.push(result)
        }
      }
    } else {
      idleRounds += 1
    }

    const hasFailures = allResults.some((result) => result.status === "error")
    done =
      parsed.done === true ||
      (roundActions.length === 0 && !hasFailures) ||
      idleRounds >= 2
  }

  const entriesEnriched = allResults.filter(
    (result) => result.tool === "lore.upsert" && result.status === "success"
  ).length

  return {
    skipped: false,
    rounds: round,
    entriesEnriched,
    actions: allResults,
    summary: replyParts.join("\n\n") || undefined,
  } satisfies GameStatusLoreEnrichmentResult
}
