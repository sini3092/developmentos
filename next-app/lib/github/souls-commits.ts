export const SOULS_LORE_DOC_COMMIT_PREFIX = "Souls: sync lore document"
export const SOULS_GAME_STATUS_OUTBOUND_COMMIT_PREFIX = "Souls: update GAME_STATUS from DevelopmentOS"

type CommitMessage = { message?: string | null }

export function isSoulsLoreDocOutboundCommit(message: string | undefined | null) {
  if (!message) return false
  return message.trim().toLowerCase().startsWith(SOULS_LORE_DOC_COMMIT_PREFIX.toLowerCase())
}

export function isSoulsGameStatusOutboundCommit(message: string | undefined | null) {
  if (!message) return false
  return message
    .trim()
    .toLowerCase()
    .startsWith(SOULS_GAME_STATUS_OUTBOUND_COMMIT_PREFIX.toLowerCase())
}

export function isSoulsOutboundDocsCommit(message: string | undefined | null) {
  return isSoulsLoreDocOutboundCommit(message) || isSoulsGameStatusOutboundCommit(message)
}

export function pushCommitsAreOnlySoulsOutboundDocs(commits: CommitMessage[]) {
  const messages = commits.map((commit) => commit.message?.trim()).filter(Boolean) as string[]
  if (messages.length === 0) {
    return false
  }
  return messages.every((message) => isSoulsOutboundDocsCommit(message))
}

export function pushTouchesOnlySoulsOutboundDocs(input: {
  commits: CommitMessage[]
  headCommit?: CommitMessage | null
}) {
  const batch = [...input.commits]
  if (input.headCommit?.message) {
    batch.push(input.headCommit)
  }
  return pushCommitsAreOnlySoulsOutboundDocs(batch)
}
