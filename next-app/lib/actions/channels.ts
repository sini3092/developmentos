"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { createHash, randomBytes } from "node:crypto"

import { runPersonalAgent, runSoulsAgent } from "@/lib/agents/run-agents"
import type { TaskStatus } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { parseAgentMentions, resolveMentionedUserIds } from "@/lib/utils/mentions"

export type ChannelActionState = {
  error?: string
  success?: string
  taskId?: string
  messageId?: string
}

function revalidateChannelPaths(slug: string, channelSlug?: string) {
  revalidatePath(`/projects/${slug}/channels`)
  if (channelSlug) {
    revalidatePath(`/projects/${slug}/channels/${channelSlug}`)
  }
}

async function notifyMentions({
  body,
  workspaceId,
  channelName,
  slug,
  channelSlug,
  messageId,
  authorName,
  memberProfiles,
}: {
  body: string
  workspaceId: string
  channelName: string
  slug: string
  channelSlug: string
  messageId: string
  authorName: string
  memberProfiles: Array<{ profile: { id: string; display_name: string } | null }>
}) {
  const mentionedUserIds = resolveMentionedUserIds(body, memberProfiles)
  if (mentionedUserIds.length === 0) {
    return
  }

  const supabase = await createClient()
  const link = `/projects/${slug}/channels/${channelSlug}`

  await Promise.all(
    mentionedUserIds.map((userId) =>
      supabase.rpc("notify_channel_mention", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
        p_title: `${authorName} mentioned you in #${channelName}`,
        p_body: body.slice(0, 200),
        p_link: link,
        p_message_id: messageId,
      })
    )
  )
}

export async function postChannelMessage(
  _prevState: ChannelActionState,
  formData: FormData
): Promise<ChannelActionState> {
  const channelId = String(formData.get("channelId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const channelSlug = String(formData.get("channelSlug") ?? "")
  const channelName = String(formData.get("channelName") ?? "channel")
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const parentMessageId = String(formData.get("parentMessageId") ?? "")
  const body = String(formData.get("body") ?? "").trim()

  if (!channelId || !body) {
    return { error: "Message cannot be empty." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { data: message, error } = await supabase
    .from("channel_messages")
    .insert({
      channel_id: channelId,
      author_id: user.id,
      body,
      parent_message_id: parentMessageId || null,
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  if (workspaceId) {
    const membersJson = String(formData.get("memberProfiles") ?? "[]")
    let memberProfiles: Array<{ profile: { id: string; display_name: string } | null }> = []
    try {
      memberProfiles = JSON.parse(membersJson) as typeof memberProfiles
    } catch {
      memberProfiles = []
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()

    await notifyMentions({
      body,
      workspaceId,
      channelName,
      slug,
      channelSlug,
      messageId: message.id,
      authorName: profile?.display_name ?? "Someone",
      memberProfiles,
    })

    const projectId = String(formData.get("projectId") ?? "")
    const agents = parseAgentMentions(body)

    if (agents.includes("souls") && projectId) {
      after(async () => {
        await runSoulsAgent({
          workspaceId,
          projectId,
          channelId,
          slug,
          channelSlug,
          messageId: message.id,
          userPrompt: body,
        })
      })
    }

    if (agents.includes("personal") && projectId) {
      after(async () => {
        await runPersonalAgent({
          workspaceId,
          projectId,
          channelId,
          slug,
          channelSlug,
          messageId: message.id,
          userId: user.id,
          userPrompt: body,
        })
      })
    }
  }

  revalidateChannelPaths(slug, channelSlug)
  return { success: "Message posted.", messageId: message.id }
}

export async function toggleMessageReaction(
  messageId: string,
  emoji: string,
  slug: string,
  channelSlug: string,
  hasReaction: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = hasReaction
    ? await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
    : await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })

  if (error) {
    return { error: error.message }
  }

  revalidateChannelPaths(slug, channelSlug)
  return { success: true }
}

export async function convertMessageToTask(
  _prevState: ChannelActionState,
  formData: FormData
): Promise<ChannelActionState> {
  const messageId = String(formData.get("messageId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const channelSlug = String(formData.get("channelSlug") ?? "")
  const channelName = String(formData.get("channelName") ?? "")
  const assigneeId = String(formData.get("assigneeId") ?? "")
  const titleInput = String(formData.get("title") ?? "").trim()

  if (!messageId || !projectId) {
    return { error: "Message is required." }
  }

  const supabase = await createClient()
  const { data: message } = await supabase
    .from("channel_messages")
    .select("id, body, linked_task_id, channel_id")
    .eq("id", messageId)
    .maybeSingle()

  if (!message) {
    return { error: "Message not found." }
  }

  if (message.linked_task_id) {
    return { error: "This message is already linked to a task." }
  }

  const firstLine = message.body.split("\n")[0]?.trim() ?? "Task from discussion"
  const title = titleInput || firstLine.slice(0, 200)
  const description = `${message.body}\n\n---\nConverted from #${channelName} channel message.`

  const { data: task, error: taskError } = await supabase.rpc("create_task", {
    p_project_id: projectId,
    p_title: title,
    p_description: description,
    p_status: "backlog" as TaskStatus,
    p_assignee_id: assigneeId || null,
  })

  if (taskError) {
    return { error: taskError.message }
  }

  const { error: linkError } = await supabase
    .from("channel_messages")
    .update({ linked_task_id: task.id })
    .eq("id", messageId)

  if (linkError) {
    return { error: linkError.message }
  }

  revalidateChannelPaths(slug, channelSlug)
  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: "Task created from message.", taskId: task.id }
}

export async function seedProjectChannels(projectId: string, slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("seed_project_channels", {
    p_project_id: projectId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateChannelPaths(slug)
  return { success: `Created ${data ?? 0} channels.` }
}
