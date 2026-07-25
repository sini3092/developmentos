import { revalidatePath } from "next/cache"

import { buildAgentProjectContext } from "@/lib/agents/build-project-context"
import { buildSoulsPrivateChatContext } from "@/lib/agents/souls-chat-memory"
import { buildLoreDocSyncIntentHint } from "@/lib/agents/souls-lore-doc-sync-intent"
import { tryImmediateLoreDocSyncFromChat } from "@/lib/agents/souls-lore-doc-sync-chat"
import { buildSoulsLoreContext } from "@/lib/agents/souls-lore-context"
import {
  SOULS_AGENT_MAX_TOKENS,
  SOULS_BOARD_INBOX_TRIAGE_ADDENDUM,
  SOULS_MAX_AGENT_ROUNDS,
  SOULS_PRIVATE_SYSTEM_PROMPT,
} from "@/lib/agents/souls-private-prompt"
import { dedupeAgentActions } from "@/lib/agents/souls-lore-dedup"
import {
  buildLoreWritePromptBlock,
  detectLoreWriteIntent,
  SOULS_LORE_WRITE_ADDENDUM,
} from "@/lib/agents/souls-lore-write-intent"
import {
  formatSoulsLoreActionSummary,
  parseSoulsAgentResponse,
} from "@/lib/agents/parse-souls-agent-response"
import { executeSoulsPrivateTool } from "@/lib/agents/souls-private-tools"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import type { Json } from "@/lib/database.types"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { createClient } from "@/lib/supabase/server"
import {
  boardInboxTriageMaxRounds,
  formatBoardInboxTriageProgressBlock,
  getBoardInboxTriageProgress,
} from "@/lib/tasks/board-inbox"

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
          lastActivityAt: new Date().toISOString(),
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

function countSuccessfulMoves(results: SoulsActionResult[]) {
  return results.filter((result) => result.tool === "tasks.move" && result.status === "success")
    .length
}

function hasSuccessfulLoreAction(results: SoulsActionResult[]) {
  return results.some((result) => result.tool.startsWith("lore.") && result.status === "success")
}

function isTriageForbiddenTool(tool: string) {
  return tool.startsWith("lore.") || tool === "docs.sync"
}

export async function runSoulsPrivateAgent(input: {
  conversationId: string
  assistantMessageId: string
  workspaceId: string
  projectId: string
  projectSlug: string
  userId: string
  userPrompt: string
  agentMode?: "default" | "board_inbox_triage"
  inboxTaskIds?: string[]
  inboxListId?: string
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

  const isTriage = input.agentMode === "board_inbox_triage"
  const inboxTargetCount = input.inboxTaskIds?.length ?? 0
  const triageMaxRounds = isTriage ? boardInboxTriageMaxRounds(inboxTargetCount) : SOULS_MAX_AGENT_ROUNDS
  const loreWriteRequested = !isTriage && detectLoreWriteIntent(input.userPrompt)

  const immediateSync =
    isTriage
      ? null
      : await tryImmediateLoreDocSyncFromChat({
          projectId: input.projectId,
          userPrompt: input.userPrompt,
        })

  if (immediateSync) {
    await supabase
      .from("souls_private_messages")
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
          loreDocSyncIntent: immediateSync.intent.reason,
        },
      })
      .eq("id", input.assistantMessageId)

    revalidateSoulsProjectPaths(input.projectSlug)
    revalidatePath(`/projects/${input.projectSlug}/souls`)
    return
  }

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
    isTriage ? null : buildLoreDocSyncIntentHint(input.userPrompt),
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
  const systemPrompt = isTriage
    ? `${SOULS_PRIVATE_SYSTEM_PROMPT}\n${SOULS_BOARD_INBOX_TRIAGE_ADDENDUM}`
    : loreWriteRequested
      ? `${SOULS_PRIVATE_SYSTEM_PROMPT}\n${SOULS_LORE_WRITE_ADDENDUM}`
      : SOULS_PRIVATE_SYSTEM_PROMPT

  try {
    while (!done && round < triageMaxRounds) {
      round += 1

      const failures = summarizeFailures(allActionResults)
      const triageProgress =
        isTriage && input.inboxListId && input.inboxTaskIds?.length
          ? await getBoardInboxTriageProgress(
              supabase,
              input.inboxListId,
              input.inboxTaskIds,
              allActionResults
            )
          : null
      const [projectContext, loreContext, chatContext] = await Promise.all([
        buildAgentProjectContext(supabase, input.projectId, input.workspaceId),
        isTriage ? Promise.resolve("") : buildSoulsLoreContext(input.projectId),
        isTriage
          ? Promise.resolve("")
          : buildSoulsPrivateChatContext({
              conversationId: input.conversationId,
              projectId: input.projectId,
              excludeMessageId: input.assistantMessageId,
              apiKey: workspace.openrouter_api_key,
              model,
            }),
      ])

      let continuationBlock = ""
      if (isTriage && triageProgress) {
        continuationBlock = [
          round > 1 ? "" : "## Board Inbox triage",
          formatBoardInboxTriageProgressBlock(triageProgress),
          round > 1
            ? [
                "",
                `## Continuation round ${round}/${triageMaxRounds}`,
                "Actions completed in previous rounds:",
                summarizeActionResults(allActionResults) || "(none yet)",
                failures
                  ? `\nFailed actions — fix these before retrying duplicates:\n${failures}`
                  : "",
                !triageProgress.isComplete
                  ? "\nDo not set done: true yet — every Inbox card must be moved or have tasks.comment.add explaining why it stays."
                  : "",
                "",
                "Continue until every card is addressed. Use tasks.move only — no lore tools.",
                "Do not repeat actions that already succeeded.",
              ].join("\n")
            : "\nStart with tasks.move for as many cards as possible this round.",
        ].join("\n")
      } else if (round > 1) {
        if (loreWriteRequested && !hasSuccessfulLoreAction(allActionResults)) {
          continuationBlock = [
            "",
            `## Continuation round ${round}/${SOULS_MAX_AGENT_ROUNDS}`,
            buildLoreWritePromptBlock(),
            "Previous reply did not run any lore tools. Return JSON with lore.upsert actions now.",
            "Actions completed in previous rounds:",
            summarizeActionResults(allActionResults) || "(none yet)",
            failures ? `\nFailed actions:\n${failures}` : "",
          ].join("\n")
        } else {
          continuationBlock = [
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
        }
      }

      const loreWriteBlock =
        loreWriteRequested && !hasSuccessfulLoreAction(allActionResults)
          ? buildLoreWritePromptBlock()
          : ""

      const userContent = [
        projectContext,
        loreContext,
        chatContext,
        basePrompt,
        loreWriteBlock,
        continuationBlock,
      ]
        .filter(Boolean)
        .join("\n")

      await persistSoulsWorkingState(supabase, input.assistantMessageId, {
        workingLabel: isTriage
          ? round === 1
            ? "Souls is triaging your Inbox…"
            : triageProgress
              ? `Souls is routing cards (${triageProgress.movedOut + triageProgress.stayingWithComment}/${triageProgress.total})…`
              : `Souls is routing cards (round ${round}/${triageMaxRounds})…`
          : round === 1
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
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      })

      const parsed = parseSoulsAgentResponse(raw, {
        requireToolActions:
          loreWriteRequested && !hasSuccessfulLoreAction(allActionResults),
      })
      const roundActions = dedupeAgentActions(parsed.actions ?? [])
      if (parsed.reply) {
        replyParts.push(parsed.reply)
      }

      if (roundActions.length > 0) {
        idleRounds = 0

        for (const action of roundActions) {
          if (isTriage && isTriageForbiddenTool(action.tool)) {
            allActionResults.push({
              tool: action.tool,
              label: action.label,
              status: "error",
              error: "Board Inbox triage — use tasks.move and tasks.comment.add only.",
            })
            continue
          }

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
            workingLabel: isTriage
              ? triageProgress
                ? `Souls is routing cards (${triageProgress.movedOut + triageProgress.stayingWithComment}/${triageProgress.total})…`
                : "Souls is triaging your Inbox…"
              : round === 1
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
      if (isTriage && input.inboxListId && input.inboxTaskIds?.length) {
        const progress = await getBoardInboxTriageProgress(
          supabase,
          input.inboxListId,
          input.inboxTaskIds,
          allActionResults
        )
        done = progress.isComplete || round >= triageMaxRounds
      } else if (loreWriteRequested && !hasSuccessfulLoreAction(allActionResults)) {
        done = round >= SOULS_MAX_AGENT_ROUNDS
      } else {
        done =
          parsed.done === true ||
          (roundActions.length === 0 && !hasFailures && idleRounds >= 2)
      }
    }

    const finalReply =
      replyParts.length > 1
        ? replyParts.join("\n\n")
        : replyParts[0] ?? "Done."

    let cappedReply =
      !done && round >= triageMaxRounds
        ? `${finalReply}\n\n(I reached the maximum number of work rounds — send "continue" if anything is still missing.)`
        : finalReply

    if (isTriage && input.inboxListId && inboxTargetCount > 0) {
      const progress = await getBoardInboxTriageProgress(
        supabase,
        input.inboxListId,
        input.inboxTaskIds ?? [],
        allActionResults
      )

      if (!progress.isComplete && progress.unaddressed.length > 0) {
        const remainingLines = progress.unaddressed
          .map((task) => `- ${task.identifier} · ${task.title}`)
          .join("\n")
        cappedReply = `${cappedReply}\n\n**Still unaddressed (${progress.unaddressed.length}):**\n${remainingLines}\n\nSend "continue" to finish triage.`
      } else if (progress.isComplete) {
        const moveCount = countSuccessfulMoves(allActionResults)
        if (moveCount === 0 && progress.stayingWithComment === 0) {
          cappedReply = `${cappedReply}\n\n(I reviewed the Inbox but did not move or comment on any cards — try triage again.)`
        }
      }
    }

    if (loreWriteRequested && hasSuccessfulLoreAction(allActionResults)) {
      const loreSummary = formatSoulsLoreActionSummary(allActionResults)
      if (loreSummary) {
        const intro = replyParts[0]?.trim() || "Done."
        cappedReply = `${intro}\n\nSouls: [Actions taken]\n${loreSummary}`
      }
    } else if (
      loreWriteRequested &&
      !hasSuccessfulLoreAction(allActionResults)
    ) {
      cappedReply = `${cappedReply}\n\n_(No lore was saved — the server did not run any lore tools. Send the text again or say "legg det inn i lore".)_`
    }

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
