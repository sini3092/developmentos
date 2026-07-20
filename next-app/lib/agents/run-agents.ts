import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { buildSoulsProjectContext } from "@/lib/agents/souls-context"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"

function revalidateChannel(slug: string, channelSlug: string) {
  revalidatePath(`/projects/${slug}/channels/${channelSlug}`)
  revalidatePath(`/projects/${slug}/channels`)
}

type RunSoulsAgentInput = {
  workspaceId: string
  projectId: string
  channelId: string
  slug: string
  channelSlug: string
  messageId: string
  userPrompt: string
}

export async function runSoulsAgent(input: RunSoulsAgentInput) {
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("openrouter_api_key, openrouter_model")
    .eq("id", input.workspaceId)
    .maybeSingle()

  if (!workspace?.openrouter_api_key) {
    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: input.channelId,
      p_body:
        "Souls is not configured yet. Add your OpenRouter API key in Settings → Souls AI.",
      p_agent_name: "souls",
      p_parent_message_id: input.messageId,
    })
    revalidateChannel(input.slug, input.channelSlug)
    return
  }

  const context = await buildSoulsProjectContext(input.projectId, input.workspaceId)

  try {
    const reply = await chatWithOpenRouter({
      apiKey: workspace.openrouter_api_key,
      model: workspace.openrouter_model ?? "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content:
            "You are Souls, the workspace AI for a small game dev team using DevelopmentOS. " +
            "Answer in the user's language (Norwegian if they write Norwegian). " +
            "Be concise and practical. Use the project context below. " +
            "When asked about progress, refer to task identifiers, checklist completion, and roadmap initiatives.",
        },
        {
          role: "user",
          content: `${context}\n\n---\n\nUser message:\n${input.userPrompt}`,
        },
      ],
    })

    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: input.channelId,
      p_body: reply,
      p_agent_name: "souls",
      p_parent_message_id: input.messageId,
    })
    revalidateChannel(input.slug, input.channelSlug)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Souls failed to respond."
    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: input.channelId,
      p_body: `Souls error: ${message}`,
      p_agent_name: "souls",
      p_parent_message_id: input.messageId,
    })
    revalidateChannel(input.slug, input.channelSlug)
  }
}

type RunPersonalAgentInput = {
  workspaceId: string
  projectId: string
  channelId: string
  slug: string
  channelSlug: string
  messageId: string
  userId: string
  userPrompt: string
}

export async function runPersonalAgent(input: RunPersonalAgentInput) {
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from("agent_jobs")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      channel_id: input.channelId,
      trigger_message_id: input.messageId,
      agent_name: "personal",
      status: "awaiting_approval",
      prompt: input.userPrompt,
      created_by: input.userId,
    })
    .select("id")
    .single()

  if (error) {
    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: input.channelId,
      p_body: `Personal error: ${error.message}`,
      p_agent_name: "personal",
      p_parent_message_id: input.messageId,
    })
    revalidateChannel(input.slug, input.channelSlug)
    return
  }

  await supabase.rpc("post_agent_channel_message", {
    p_channel_id: input.channelId,
    p_body:
      `Personal (Codex) received your request. Job \`${job.id.slice(0, 8)}\` is queued.\n\n` +
      "Run the Codex bridge on your PC (Settings → Codex Bridge). " +
      "I'll reply here when Codex picks it up and when the work is done.",
    p_agent_name: "personal",
    p_parent_message_id: input.messageId,
  })
  revalidateChannel(input.slug, input.channelSlug)
}
