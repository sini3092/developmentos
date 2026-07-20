import { notFound } from "next/navigation"

import type {
  ChannelMessageWithAuthor,
  ChannelWithMessages,
  MessageReaction,
  Profile,
  ProjectChannel,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type LinkedTaskSummary = {
  id: string
  identifier: string
  title: string
}

export type MessageReactionGroup = {
  emoji: string
  count: number
  reacted_by_current_user: boolean
  user_ids: string[]
}

export type ChannelMessageNode = ChannelMessageWithAuthor & {
  replies: ChannelMessageNode[]
  reaction_groups: MessageReactionGroup[]
  linked_task: LinkedTaskSummary | null
}

export type ChannelWithMessageTree = ProjectChannel & {
  messages: ChannelMessageNode[]
}

function groupReactions(
  reactions: MessageReaction[],
  currentUserId: string | null
): MessageReactionGroup[] {
  const groups = new Map<string, MessageReactionGroup>()

  for (const reaction of reactions) {
    const existing = groups.get(reaction.emoji)
    if (existing) {
      existing.count += 1
      existing.user_ids.push(reaction.user_id)
      if (reaction.user_id === currentUserId) {
        existing.reacted_by_current_user = true
      }
    } else {
      groups.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        reacted_by_current_user: reaction.user_id === currentUserId,
        user_ids: [reaction.user_id],
      })
    }
  }

  return [...groups.values()]
}

function buildMessageTree(
  messages: ChannelMessageWithAuthor[],
  reactionsByMessage: Map<string, MessageReaction[]>,
  linkedTasksByMessage: Map<string, LinkedTaskSummary>,
  currentUserId: string | null
): ChannelMessageNode[] {
  const nodes = new Map<string, ChannelMessageNode>()

  for (const message of messages) {
    nodes.set(message.id, {
      ...message,
      replies: [],
      reaction_groups: groupReactions(reactionsByMessage.get(message.id) ?? [], currentUserId),
      linked_task: linkedTasksByMessage.get(message.id) ?? null,
    })
  }

  const roots: ChannelMessageNode[] = []

  for (const node of nodes.values()) {
    if (node.parent_message_id && nodes.has(node.parent_message_id)) {
      nodes.get(node.parent_message_id)!.replies.push(node)
    } else if (!node.parent_message_id) {
      roots.push(node)
    }
  }

  const sortByDate = (a: ChannelMessageNode, b: ChannelMessageNode) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

  roots.sort(sortByDate)
  for (const node of nodes.values()) {
    node.replies.sort(sortByDate)
  }

  return roots
}

export async function getProjectChannels(projectId: string): Promise<ProjectChannel[]> {
  const supabase = await createClient()

  const { data: channels } = await supabase
    .from("project_channels")
    .select("*")
    .eq("project_id", projectId)
    .order("position")
    .order("name")

  return channels ?? []
}

export async function getChannelWithMessages(
  projectId: string,
  channelSlug: string
): Promise<ChannelWithMessages | null> {
  const channel = await getChannelWithMessageTree(projectId, channelSlug)
  if (!channel) {
    return null
  }

  return {
    ...channel,
    messages: channel.messages,
  }
}

export async function getChannelWithMessageTree(
  projectId: string,
  channelSlug: string
): Promise<ChannelWithMessageTree | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: channel } = await supabase
    .from("project_channels")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", channelSlug)
    .maybeSingle()

  if (!channel) {
    return null
  }

  const { data: messages } = await supabase
    .from("channel_messages")
    .select("*")
    .eq("channel_id", channel.id)
    .order("created_at", { ascending: true })

  if (!messages?.length) {
    return { ...channel, messages: [] }
  }

  const messageIds = messages.map((message) => message.id)
  const authorIds = [
    ...new Set(
      messages
        .map((message) => message.author_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const linkedTaskIds = [
    ...new Set(
      messages
        .map((message) => message.linked_task_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const [{ data: profiles }, { data: reactions }, { data: tasks }] = await Promise.all([
    authorIds.length > 0
      ? supabase.from("profiles").select("*").in("id", authorIds)
      : Promise.resolve({ data: [] as Profile[] }),
    supabase.from("message_reactions").select("*").in("message_id", messageIds),
    linkedTaskIds.length > 0
      ? supabase.from("tasks").select("id, identifier, title").in("id", linkedTaskIds)
      : Promise.resolve({ data: [] as LinkedTaskSummary[] }),
  ])

  const reactionsByMessage = new Map<string, MessageReaction[]>()
  for (const reaction of reactions ?? []) {
    const list = reactionsByMessage.get(reaction.message_id) ?? []
    list.push(reaction)
    reactionsByMessage.set(reaction.message_id, list)
  }

  const tasksById = new Map((tasks ?? []).map((task) => [task.id, task]))
  const linkedTasksByMessage = new Map<string, LinkedTaskSummary>()
  for (const message of messages) {
    if (message.linked_task_id) {
      const task = tasksById.get(message.linked_task_id)
      if (task) {
        linkedTasksByMessage.set(message.id, task)
      }
    }
  }

  const messagesWithAuthors: ChannelMessageWithAuthor[] = messages.map((message) => ({
    ...message,
    author: profiles?.find((profile) => profile.id === message.author_id) ?? null,
  }))

  return {
    ...channel,
    messages: buildMessageTree(
      messagesWithAuthors,
      reactionsByMessage,
      linkedTasksByMessage,
      user?.id ?? null
    ),
  }
}

export async function requireChannel(projectId: string, channelSlug: string) {
  const channel = await getChannelWithMessageTree(projectId, channelSlug)

  if (!channel) {
    notFound()
  }

  return channel
}
