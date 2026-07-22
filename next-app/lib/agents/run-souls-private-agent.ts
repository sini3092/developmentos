import { revalidatePath } from "next/cache"

import { buildAgentProjectContext } from "@/lib/agents/build-project-context"
import { buildSoulsPrivateChatContext } from "@/lib/agents/souls-chat-memory"
import { buildSoulsLoreContext } from "@/lib/agents/souls-lore-context"
import {
  SOULS_AGENT_MAX_TOKENS,
  SOULS_MAX_AGENT_ROUNDS,
  SOULS_PRIVATE_SYSTEM_PROMPT,
} from "@/lib/agents/souls-private-prompt"
import { dedupeAgentActions } from "@/lib/agents/souls-lore-dedup"
import { executeSoulsPrivateTool } from "@/lib/agents/souls-private-tools"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import type { Json } from "@/lib/database.types"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { createClient } from "@/lib/supabase/server"

type SoulsAgentResponse = {
  reply: string
  done?: boolean
  actions?: Array<{ tool: string; label: string; input: Record<string, unknown> }>
}

function parseSoulsAgentResponse(raw: string): SoulsAgentResponse {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { reply: trimmed, done: true, actions: [] }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as SoulsAgentResponse
    return {
      reply: parsed.reply?.trim() || trimmed,
      done: parsed.done,
      actions: parsed.actions ?? [],
    }
  } catch {
    return { reply: trimmed, done: true, actions: [] }
  }
}

function summarizeActionResults(results: SoulsActionResult[]) {
  return results
    .map((result) => {
      const slug =
        result.after && typeof result.after === "object" && "slug" in result.after
          ? String(result.after.slug)
          : null
      const status = result.status === "success" ? "ok" : "failed"
      const errorSuffix = result.status === "error" && result.error ? ` — ${result.error}` : ""
      return `- [${status}] ${result.summary ?? result.label}${slug ? ` (slug: ${slug})` : ""}${errorSuffix}`
    })
    .join("\n")
}

function summarizeFailures(results: SoulsActionResult[]) {
  return results
    .filter((result) => result.status === "error")
    .map((result) => `- ${result.label}: ${result.error ?? "Unknown error"}`)
    .join("\n")
}

async function persistSoulsWorkingState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assistantMessageId: string,
  input: {
    workingLabel: string
    actions: SoulsActionResult[]
    rounds: number
  }
) {
  await supabase
    .from("souls_private_messages")
    .update({
      metadata: JSON.parse(
        JSON.stringify({
          workingLabel: input.workingLabel,
          actions: input.actions,
          rounds: input.rounds,
        })
      ) as Json,
    })
    .eq("id", assistantMessageId)
}

function revalidateSoulsProjectPaths(projectSlug: string) {
  revalidatePath(`/projects/${projectSlug}/lore`)
  revalidatePath(`/projects/${projectSlug}/lore/browse`)
  revalidatePath(`/projects/${projectSlug}/lore/world`)
  revalidatePath(`/projects/${projectSlug}/lore/collections`)
  revalidatePath(`/projects/${projectSlug}/lore/graph`)
  revalidatePath(`/projects/${projectSlug}/tasks`)
  revalidatePath(`/projects/${projectSlug}/tasks/board`)
}

export async function runSoulsPrivateAgent(input: {
  conversationId: string
  assistantMessageId: string
  workspaceId: string
  projectId: string
  projectSlug: string
  userId: string
  userPrompt: string
  attachedLore?: {
    name: string
    slug: string
    entryType: string
    summary?: string | null
    content?: string
  }
}) {
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("openrouter_api_key, openrouter_model")
    .eq("id", input.workspaceId)
    .maybeSingle()

  if (!workspace?.openrouter_api_key) {
    await supabase
      .from("souls_private_messages")
      .update({
        body: "Souls is not configured yet. Add your OpenRouter API key in Settings → Souls AI.",
        status: "error",
      })
      .eq("id", input.assistantMessageId)
    return
  }

  const model = workspace.openrouter_model ?? "google/gemini-2.0-flash-001"

  await supabase
    .from("souls_private_messages")
    .update({
      status: "working",
      metadata: { workingLabel: "Souls is reading your world…" },
    })
    .eq("id", input.assistantMessageId)

  const attachedBlock = input.attachedLore
    ? [
        "",
        "## Attached lore (user sent this entry)",
        `Name: ${input.attachedLore.name}`,
        `Type: ${input.attachedLore.entryType}`,
        `Slug: ${input.attachedLore.slug}`,
        input.attachedLore.summary ? `Summary: ${input.attachedLore.summary}` : "",
        input.attachedLore.content ? `Content:\n${input.attachedLore.content.slice(0, 20000)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : ""

  const basePrompt = [
    "## Original user request",
    input.userPrompt,
    attachedBlock,
  ]
    .filter(Boolean)
    .join("\n")

  const allActionResults: SoulsActionResult[] = []
  const replyParts: string[] = []
  let round = 0
  let done = false
  let idleRounds = 0

  try {
    while (!done && round < SOULS_MAX_AGENT_ROUNDS) {
      round += 1

      const failures = summarizeFailures(allActionResults)
      const [projectContext, loreContext, chatContext] = await Promise.all([
        buildAgentProjectContext(supabase, input.projectId, input.workspaceId),
        buildSoulsLoreContext(input.projectId),
        buildSoulsPrivateChatContext({
          conversationId: input.conversationId,
          projectId: input.projectId,
          excludeMessageId: input.assistantMessageId,
          apiKey: workspace.openrouter_api_key,
          model,
        }),
      ])

      const continuationBlock =
        round > 1
          ? [
              "",
              `## Continuation round ${round}/${SOULS_MAX_AGENT_ROUNDS}`,
              "Actions completed in previous rounds:",
              summarizeActionResults(allActionResults) || "(none yet)",
              failures
                ? `\nFailed actions — fix these before retrying duplicates:\n${failures}`
                : "",
              "",
              "Continue structuring everything from the original request.",
              "Prefer lore.upsert with sections[] to create entries and content in one step.",
              "Do not repeat actions that already succeeded.",
              "Set done: true only when every part of the pasted lore is placed correctly.",
            ].join("\n")
          : ""

      const userContent = [
        projectContext,
        loreContext,
        chatContext,
        basePrompt,
        continuationBlock,
      ]
        .filter(Boolean)
        .join("\n")

      await persistSoulsWorkingState(supabase, input.assistantMessageId, {
        workingLabel:
          round === 1
            ? "Souls is structuring your lore…"
            : `Souls is continuing (round ${round}/${SOULS_MAX_AGENT_ROUNDS})…`,
        actions: allActionResults,
        rounds: round,
      })

      const raw = await chatWithOpenRouter({
        apiKey: workspace.openrouter_api_key,
        model,
        maxTokens: SOULS_AGENT_MAX_TOKENS,
        temperature: 0.3,
        messages: [
          { role: "system", content: SOULS_PRIVATE_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      })

      const parsed = parseSoulsAgentResponse(raw)
      const roundActions = dedupeAgentActions(parsed.actions ?? [])
      if (parsed.reply) {
        replyParts.push(parsed.reply)
      }

      if (roundActions.length > 0) {
        idleRounds = 0

        for (const action of roundActions) {
          await persistSoulsWorkingState(supabase, input.assistantMessageId, {
            workingLabel: `Souls is applying: ${action.label}`,
            actions: allActionResults,
            rounds: round,
          })

          const result = await executeSoulsPrivateTool({
            tool: action.tool,
            label: action.label,
            toolInput: action.input ?? {},
            projectId: input.projectId,
            projectSlug: input.projectSlug,
            workspaceId: input.workspaceId,
            userId: input.userId,
          })
          allActionResults.push(result)

          await persistSoulsWorkingState(supabase, input.assistantMessageId, {
            workingLabel:
              round === 1
                ? "Souls is structuring your lore…"
                : `Souls is continuing (round ${round}/${SOULS_MAX_AGENT_ROUNDS})…`,
            actions: allActionResults,
            rounds: round,
          })
        }
      } else {
        idleRounds += 1
      }

      const hasFailures = allActionResults.some((result) => result.status === "error")
      done =
        parsed.done === true ||
        (roundActions.length === 0 && !hasFailures) ||
        idleRounds >= 2
    }

    const finalReply =
      replyParts.length > 1
        ? replyParts.join("\n\n")
        : replyParts[0] ?? "Done."

    const cappedReply =
      !done && round >= SOULS_MAX_AGENT_ROUNDS
        ? `${finalReply}\n\n(I reached the maximum number of work rounds — send "continue" if anything is still missing.)`
        : finalReply

    await supabase
      .from("souls_private_messages")
      .update({
        body: cappedReply,
        status: "complete",
        metadata: JSON.parse(
          JSON.stringify({
            actions: allActionResults,
            rounds: round,
            workingLabel: undefined,
          })
        ) as Json,
      })
      .eq("id", input.assistantMessageId)

    await supabase
      .from("souls_private_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.conversationId)

    revalidateSoulsProjectPaths(input.projectSlug)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Souls failed to respond."
    await supabase
      .from("souls_private_messages")
      .update({
        body: `Souls error: ${message}`,
        status: "error",
        metadata: JSON.parse(
          JSON.stringify({
            actions: allActionResults,
            rounds: round,
          })
        ) as Json,
      })
      .eq("id", input.assistantMessageId)
  }
}
