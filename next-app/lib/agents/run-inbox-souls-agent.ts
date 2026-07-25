import { revalidatePath } from "next/cache"

import { buildAgentProjectContext } from "@/lib/agents/build-project-context"
import { dedupeAgentActions } from "@/lib/agents/souls-lore-dedup"
import { buildSoulsLoreContext } from "@/lib/agents/souls-lore-context"
import { buildLoreDocSyncIntentHint } from "@/lib/agents/souls-lore-doc-sync-intent"
import { tryImmediateLoreDocSyncFromChat } from "@/lib/agents/souls-lore-doc-sync-chat"
import {
  SOULS_AGENT_MAX_TOKENS,
  SOULS_INBOX_THREAD_ADDENDUM,
  SOULS_MAX_AGENT_ROUNDS,
  SOULS_PRIVATE_SYSTEM_PROMPT,
} from "@/lib/agents/souls-private-prompt"
import { executeSoulsPrivateTool } from "@/lib/agents/souls-private-tools"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import type { SoulsReportMetadata } from "@/lib/inbox/types"
import type { Json } from "@/lib/database.types"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { createAdminClient } from "@/lib/supabase/admin"

type SoulsAgentResponse = {
  reply: string
  done?: boolean
  actions?: Array<{ tool: string; label: string; input: Record<string, unknown> }>
}

function parseAgentResponse(raw: string): SoulsAgentResponse {
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

function formatThreadHistory(
  history: Array<{ sender_kind: string; body: string; created_at: string }>
) {
  return history
    .map((message) => {
      const label =
        message.sender_kind === "user"
          ? "User"
          : message.sender_kind === "souls"
            ? "Souls"
            : message.sender_kind
      return `[${label} · ${message.created_at}]\n${message.body}`
    })
    .join("\n\n")
}

function revalidateSoulsProjectPaths(projectSlug: string) {
  revalidatePath("/inbox")
  revalidatePath(`/projects/${projectSlug}/lore`)
  revalidatePath(`/projects/${projectSlug}/lore/browse`)
  revalidatePath(`/projects/${projectSlug}/lore/world`)
  revalidatePath(`/projects/${projectSlug}/tasks`)
  revalidatePath(`/projects/${projectSlug}/tasks/board`)
}

async function persistInboxWorkingState(
  supabase: ReturnType<typeof createAdminClient>,
  assistantMessageId: string,
  input: { workingLabel: string; actions: SoulsActionResult[]; rounds: number }
) {
  await supabase
    .from("inbox_messages")
    .update({
      metadata: JSON.parse(
        JSON.stringify({
          workingLabel: input.workingLabel,
          actions: input.actions,
          rounds: input.rounds,
          lastActivityAt: new Date().toISOString(),
        })
      ) as Json,
    })
    .eq("id", assistantMessageId)
}

export async function runInboxSoulsAgent(input: {
  threadId: string
  assistantMessageId: string
  workspaceId: string
  projectId: string
  projectSlug: string
  userId: string
  userPrompt: string
  reportMetadata: SoulsReportMetadata
}) {
  const supabase = createAdminClient()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("openrouter_api_key, openrouter_model")
    .eq("id", input.workspaceId)
    .maybeSingle()

  if (!workspace?.openrouter_api_key) {
    await supabase
      .from("inbox_messages")
      .update({
        body: "I cannot reach the archives yet — add your OpenRouter API key in Settings.",
        status: "error",
      })
      .eq("id", input.assistantMessageId)
    return
  }

  const model = workspace.openrouter_model ?? "google/gemini-2.0-flash-001"

  const immediateSync = await tryImmediateLoreDocSyncFromChat({
    projectId: input.projectId,
    userPrompt: input.userPrompt,
  })

  if (immediateSync) {
    await supabase
      .from("inbox_messages")
      .update({
        body: immediateSync.reply,
        status: "complete",
        metadata: {
          actions: [
            {
              tool: "docs.sync",
              label: "Sync lore to loredoc.md",
              status: immediateSync.result.skipped ? "error" : "success",
              summary: immediateSync.result.summary,
            },
          ],
        },
      })
      .eq("id", input.assistantMessageId)

    revalidateSoulsProjectPaths(input.projectSlug)
    return
  }

  const { data: history } = await supabase
    .from("inbox_messages")
    .select("sender_kind, body, created_at")
    .eq("thread_id", input.threadId)
    .neq("id", input.assistantMessageId)
    .order("created_at", { ascending: true })
    .limit(24)

  const reportBlock = [
    "## Souls GAME_STATUS sync report context",
    `Commit: ${input.reportMetadata.commit_sha ?? "unknown"}`,
    `Branch: ${input.reportMetadata.branch ?? "main"}`,
    `File: ${input.reportMetadata.status_path ?? "docs/GAME_STATUS.md"}`,
    input.reportMetadata.outcome ? `Outcome: ${input.reportMetadata.outcome}` : "",
    input.reportMetadata.tasks_updated != null
      ? `Tasks updated: ${input.reportMetadata.tasks_updated}`
      : "",
    input.reportMetadata.lore_entries_enriched != null
      ? `Lore entries enriched: ${input.reportMetadata.lore_entries_enriched}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")

  const basePrompt = [
    buildLoreDocSyncIntentHint(input.userPrompt),
    reportBlock,
    "",
    "## Thread history",
    formatThreadHistory(history ?? []),
    "",
    "## Latest user message",
    input.userPrompt,
  ]
    .filter(Boolean)
    .join("\n")

  const systemPrompt = `${SOULS_PRIVATE_SYSTEM_PROMPT}\n${SOULS_INBOX_THREAD_ADDENDUM}`
  const allActionResults: SoulsActionResult[] = []
  const replyParts: string[] = []
  let round = 0
  let done = false
  let idleRounds = 0

  try {
    while (!done && round < SOULS_MAX_AGENT_ROUNDS) {
      round += 1

      const failures = summarizeFailures(allActionResults)
      const [projectContext, loreContext] = await Promise.all([
        buildAgentProjectContext(supabase, input.projectId, input.workspaceId),
        buildSoulsLoreContext(input.projectId),
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
              "Continue from the user's latest message.",
              "Do not repeat actions that already succeeded.",
              "Set done: true when the request is complete or you are waiting for approval.",
            ].join("\n")
          : ""

      const userContent = [projectContext, loreContext, basePrompt, continuationBlock]
        .filter(Boolean)
        .join("\n")

      await persistInboxWorkingState(supabase, input.assistantMessageId, {
        workingLabel:
          round === 1
            ? "Souls is considering your words…"
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      })

      const parsed = parseAgentResponse(raw)
      const roundActions = dedupeAgentActions(parsed.actions ?? [])
      if (parsed.reply) {
        replyParts.push(parsed.reply)
      }

      if (roundActions.length > 0) {
        idleRounds = 0

        for (const action of roundActions) {
          await persistInboxWorkingState(supabase, input.assistantMessageId, {
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
      replyParts.length > 1 ? replyParts.join("\n\n") : replyParts[0] ?? "Done."

    const cappedReply =
      !done && round >= SOULS_MAX_AGENT_ROUNDS
        ? `${finalReply}\n\n(I reached the maximum number of work rounds — send "continue" if anything is still missing.)`
        : finalReply

    await supabase
      .from("inbox_messages")
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
      .from("inbox_threads")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", input.threadId)

    revalidateSoulsProjectPaths(input.projectSlug)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Souls failed to respond."
    await supabase
      .from("inbox_messages")
      .update({
        body: `Something went wrong: ${message}`,
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
