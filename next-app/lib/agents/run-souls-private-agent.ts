import { revalidatePath } from "next/cache"

import { buildAgentProjectContext } from "@/lib/agents/build-project-context"
import { buildSoulsPrivateChatContext } from "@/lib/agents/souls-chat-memory"
import { SOULS_PRIVATE_SYSTEM_PROMPT } from "@/lib/agents/souls-private-prompt"
import { executeSoulsPrivateTool } from "@/lib/agents/souls-private-tools"
import { buildSoulsLoreContext } from "@/lib/agents/souls-lore-context"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import type { Json } from "@/lib/database.types"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { createClient } from "@/lib/supabase/server"

type SoulsAgentResponse = {
  reply: string
  actions?: Array<{ tool: string; label: string; input: Record<string, unknown> }>
}

function parseSoulsAgentResponse(raw: string): SoulsAgentResponse {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return { reply: trimmed, actions: [] }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as SoulsAgentResponse
    return {
      reply: parsed.reply?.trim() || trimmed,
      actions: parsed.actions ?? [],
    }
  } catch {
    return { reply: trimmed, actions: [] }
  }
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

  const attachedBlock = input.attachedLore
    ? [
        "",
        "## Attached lore (user sent this entry)",
        `Name: ${input.attachedLore.name}`,
        `Type: ${input.attachedLore.entryType}`,
        `Slug: ${input.attachedLore.slug}`,
        input.attachedLore.summary ? `Summary: ${input.attachedLore.summary}` : "",
        input.attachedLore.content ? `Content:\n${input.attachedLore.content.slice(0, 12000)}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : ""

  const userContent = [
    projectContext,
    loreContext,
    chatContext,
    attachedBlock,
    "",
    "## Latest user message",
    input.userPrompt,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const raw = await chatWithOpenRouter({
      apiKey: workspace.openrouter_api_key,
      model,
      maxTokens: 2000,
      temperature: 0.35,
      messages: [
        { role: "system", content: SOULS_PRIVATE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    })

    const parsed = parseSoulsAgentResponse(raw)
    const actionResults: SoulsActionResult[] = []

    if (parsed.actions && parsed.actions.length > 0) {
      await supabase
        .from("souls_private_messages")
        .update({
          metadata: { workingLabel: "Souls is making changes…" },
        })
        .eq("id", input.assistantMessageId)

      for (const action of parsed.actions) {
        const result = await executeSoulsPrivateTool({
          tool: action.tool,
          label: action.label,
          toolInput: action.input ?? {},
          projectId: input.projectId,
          projectSlug: input.projectSlug,
          workspaceId: input.workspaceId,
          userId: input.userId,
        })
        actionResults.push(result)
      }
    }

    await supabase
      .from("souls_private_messages")
      .update({
        body: parsed.reply,
        status: "complete",
        metadata: JSON.parse(JSON.stringify({ actions: actionResults })) as Json,
      })
      .eq("id", input.assistantMessageId)

    await supabase
      .from("souls_private_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.conversationId)

    revalidatePath(`/projects/${input.projectSlug}/lore`)
    revalidatePath(`/projects/${input.projectSlug}/tasks`)
    revalidatePath(`/projects/${input.projectSlug}/tasks/board`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Souls failed to respond."
    await supabase
      .from("souls_private_messages")
      .update({
        body: `Souls error: ${message}`,
        status: "error",
      })
      .eq("id", input.assistantMessageId)
  }
}
