import {
  runSoulsDocsSyncForAgent,
  type DocsSyncResult,
} from "@/lib/agents/run-souls-repo-docs-sync"
import { detectLoreDocSyncIntent } from "@/lib/agents/souls-lore-doc-sync-intent"

export function formatLoreDocSyncReply(result: DocsSyncResult, loreOnly: boolean) {
  if (result.skipped) {
    return `I could not sync lore to the document: ${result.reason ?? "sync skipped."}`
  }

  if (result.loreDocCommitted) {
    return loreOnly
      ? "Done — I exported the lore library to docs/loredoc.md in the game repo. Coding AIs can read it there now."
      : "Done — I updated docs/loredoc.md in the game repo (and reviewed GAME_STATUS where needed)."
  }

  if (result.gameStatusCommitted) {
    return "GAME_STATUS.md was updated with missing sections. Lore in loredoc.md already matched DevelopmentOS."
  }

  return loreOnly
    ? "Lore in DevelopmentOS already matches docs/loredoc.md on GitHub — no file change was needed."
    : result.summary ?? "Docs are already in sync — nothing to commit."
}

export async function tryImmediateLoreDocSyncFromChat(input: {
  projectId: string
  userPrompt: string
}) {
  const intent = detectLoreDocSyncIntent(input.userPrompt)
  if (!intent?.immediate) {
    return null
  }

  const result = await runSoulsDocsSyncForAgent({
    projectId: input.projectId,
    trigger: "souls_chat_intent",
    loreOnly: intent.loreOnly,
  })

  return {
    intent,
    result,
    reply: formatLoreDocSyncReply(result, intent.loreOnly),
  }
}
