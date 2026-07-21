import type { ChannelMessageNode } from "@/lib/auth/channels-context"

export function countChannelMessages(messages: ChannelMessageNode[]): number {
  return messages.reduce((total, message) => total + 1 + countChannelMessages(message.replies), 0)
}

export function getMessageTreeSignature(messages: ChannelMessageNode[]): string {
  const parts: string[] = []

  function walk(nodes: ChannelMessageNode[]) {
    for (const node of nodes) {
      parts.push(`${node.id}:${node.updated_at}:${node.body.length}:${node.replies.length}`)
      walk(node.replies)
    }
  }

  walk(messages)
  return parts.join("|")
}

export function scrollContainerToBottom(
  container: HTMLElement,
  behavior: ScrollBehavior = "smooth"
) {
  container.scrollTo({
    top: container.scrollHeight,
    behavior,
  })
}

export function isContainerNearBottom(container: HTMLElement, threshold = 96) {
  return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
}
