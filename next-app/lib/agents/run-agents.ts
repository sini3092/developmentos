import { revalidatePath } from "next/cache"

import { buildChannelTranscript } from "@/lib/agents/build-channel-transcript"
import { buildGithubAgentContext } from "@/lib/agents/build-github-agent-context"
import {
  formatSoulsGithubFixDeclined,
  formatSoulsGithubFixMessage,
} from "@/lib/agents/format-souls-github-fix-message"
import { attemptSoulsGithubFix, isSoulsFixRequest } from "@/lib/agents/souls-github-fix"
import { SOULS_SYSTEM_PROMPT } from "@/lib/agents/personalities"
import { buildSoulsProjectContext } from "@/lib/agents/souls-context"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import { createClient } from "@/lib/supabase/server"

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

async function soulsIntroReply(input: {
  apiKey: string
  model: string
  userContent: string
  instruction: string
}) {
  return chatWithOpenRouter({
    apiKey: input.apiKey,
    model: input.model,
    maxTokens: 220,
    temperature: 0.5,
    messages: [
      { role: "system", content: SOULS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${input.userContent}\n\n## Instruction\n${input.instruction}`,
      },
    ],
  })
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

  const [context, transcript, githubContext] = await Promise.all([
    buildSoulsProjectContext(input.projectId, input.workspaceId),
    buildChannelTranscript(supabase, input.channelId, {
      limit: 30,
      beforeMessageId: input.messageId,
    }),
    buildGithubAgentContext(input.projectId),
  ])

  const userContent = [
    context,
    githubContext,
    "",
    "## Recent channel chat (includes Personal and teammates)",
    transcript,
    "",
    "---",
    "",
    "## Message to answer now",
    input.userPrompt,
  ]
    .filter(Boolean)
    .join("\n")

  const model = workspace.openrouter_model ?? "google/gemini-2.0-flash-001"

  try {
    let body = ""

    if (isSoulsFixRequest(input.userPrompt)) {
      try {
        const fixResult = await attemptSoulsGithubFix({
          apiKey: workspace.openrouter_api_key,
          model,
          projectId: input.projectId,
          userPrompt: input.userPrompt,
          githubContext,
          transcript,
        })

        if (fixResult?.kind === "applied") {
          const intro = await soulsIntroReply({
            apiKey: workspace.openrouter_api_key,
            model,
            userContent,
            instruction:
              "The GitHub fix below is already done. Write 1–2 short sentences in the user's language — personality ok, no bullet lists, no repeating the diff.",
          })

          body = formatSoulsGithubFixMessage({
            intro,
            summary: fixResult.summary,
            prTitle: fixResult.prTitle,
            pullRequestUrl: fixResult.pullRequestUrl,
            pullRequestNumber: fixResult.pullRequestNumber,
            branchName: fixResult.branchName,
            branchUrl: fixResult.branchUrl,
            baseBranch: fixResult.baseBranch,
            repoLabel: fixResult.repoLabel,
            files: fixResult.files,
          })
        } else if (fixResult?.kind === "declined") {
          const intro = await soulsIntroReply({
            apiKey: workspace.openrouter_api_key,
            model,
            userContent,
            instruction:
              "Auto-fix on GitHub was declined for the reason below. Reply briefly in the user's language and suggest what to do next.",
          })

          body = [intro, "", formatSoulsGithubFixDeclined(fixResult.message)].join("\n")
        } else if (!githubContext) {
          body = await soulsIntroReply({
            apiKey: workspace.openrouter_api_key,
            model,
            userContent,
            instruction:
              "User asked for a code fix but GitHub is not linked. Explain that Souls needs GitHub connected in Settings, or they can use @personal for local changes.",
          })
        } else {
          body = await chatWithOpenRouter({
            apiKey: workspace.openrouter_api_key,
            model,
            messages: [
              { role: "system", content: SOULS_SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
          })
        }
      } catch (fixError) {
        const message =
          fixError instanceof Error ? fixError.message : "GitHub fix attempt failed."
        const intro = await soulsIntroReply({
          apiKey: workspace.openrouter_api_key,
          model,
          userContent,
          instruction: "GitHub auto-fix failed. Apologize briefly and suggest next steps.",
        })
        body = [intro, "", formatSoulsGithubFixDeclined(message)].join("\n")
      }
    } else {
      body = await chatWithOpenRouter({
        apiKey: workspace.openrouter_api_key,
        model,
        messages: [
          { role: "system", content: SOULS_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      })
    }

    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: input.channelId,
      p_body: body,
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
      "Using your Codex settings from Settings. Start the bridge on your PC — I'll post updates here as Codex works.",
    p_agent_name: "personal",
    p_parent_message_id: input.messageId,
  })
  revalidateChannel(input.slug, input.channelSlug)
}
