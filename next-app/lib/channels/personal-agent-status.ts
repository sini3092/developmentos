import type { ChannelMessageNode } from "@/lib/auth/channels-context"

export function isPersonalCompletionReply(body: string) {
  return (
    /Personal \(Codex\) finished\./i.test(body) ||
    /Personal \(Codex\) could not complete the job/i.test(body)
  )
}

export function personalHasFinalReply(message: ChannelMessageNode) {
  return message.replies.some(
    (reply) => reply.agent_name === "personal" && isPersonalCompletionReply(reply.body)
  )
}

export function personalAwaitingFinalReply(message: ChannelMessageNode) {
  const mentionedPersonal = /@(?:personal|codex)\b/i.test(message.body)
  if (!mentionedPersonal) {
    return false
  }

  return !personalHasFinalReply(message)
}
