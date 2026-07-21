import type {
  ChannelMessageNode,
  ChannelWithMessageTree,
  MessageReactionGroup,
} from "@/lib/auth/channels-context"
import type { ChannelMessageWithAuthor, MessageReaction, Profile } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/client"

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
  currentUserId: string | null
): ChannelMessageNode[] {
  const nodes = new Map<string, ChannelMessageNode>()

  for (const message of messages) {
    nodes.set(message.id, {
      ...message,
      replies: [],
      reaction_groups: groupReactions(reactionsByMessage.get(message.id) ?? [], currentUserId),
      linked_task: null,
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

export async function fetchChannelMessagesClient(
  channelId: string
): Promise<ChannelMessageNode[]> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: messages, error } = await supabase
    .from("channel_messages")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true })

  if (error || !messages?.length) {
    return []
  }

  const messageIds = messages.map((message) => message.id)
  const authorIds = [
    ...new Set(
      messages
        .map((message) => message.author_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const [{ data: profiles }, { data: reactions }] = await Promise.all([
    authorIds.length > 0
      ? supabase.from("profiles").select("*").in("id", authorIds)
      : Promise.resolve({ data: [] as Profile[] }),
    supabase.from("message_reactions").select("*").in("message_id", messageIds),
  ])

  const reactionsByMessage = new Map<string, MessageReaction[]>()
  for (const reaction of reactions ?? []) {
    const list = reactionsByMessage.get(reaction.message_id) ?? []
    list.push(reaction)
    reactionsByMessage.set(reaction.message_id, list)
  }

  const messagesWithAuthors: ChannelMessageWithAuthor[] = messages.map((message) => ({
    ...message,
    author: profiles?.find((profile) => profile.id === message.author_id) ?? null,
  }))

  return buildMessageTree(messagesWithAuthors, reactionsByMessage, user?.id ?? null)
}

export type LiveChannel = ChannelWithMessageTree & {
  messages: ChannelMessageNode[]
}
