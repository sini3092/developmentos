import type { SupabaseClient } from "@supabase/supabase-js"

import { notifyProjectMembersSoulsGameStatus } from "@/lib/souls/game-status-notifications"
import type { Database } from "@/lib/database.types"

type Client = SupabaseClient<Database>

export async function notifyProjectMembersSoulsDocsSync(
  supabase: Client,
  input: {
    workspaceId: string
    projectId: string
    projectSlug: string
    projectName: string
    loreDocCommitted: boolean
    gameStatusCommitted: boolean
    summary: string
    loreDocPath: string
    gameStatusError?: string
    trigger?: string
  }
) {
  const lorePart = input.loreDocCommitted
    ? `I exported DevelopmentOS lore to \`${input.loreDocPath}\` in the game repo.`
    : `\`${input.loreDocPath}\` already matched the lore library — no file change was needed.`

  let gameStatusPart: string
  if (input.gameStatusError) {
    gameStatusPart = `I could not finish the GAME_STATUS review: ${input.gameStatusError} You can try again from project settings.`
  } else if (input.gameStatusCommitted) {
    gameStatusPart = "I also updated GAME_STATUS.md with sections that were missing from Git."
  } else {
    gameStatusPart = "GAME_STATUS.md did not need changes from my side."
  }

  const title = input.loreDocCommitted
    ? "Lore document synced to GitHub"
    : input.gameStatusCommitted
      ? "GAME_STATUS updated from DevelopmentOS"
      : "Docs sync complete"

  const body = [input.summary.trim(), lorePart, gameStatusPart].filter(Boolean).join(" ")

  return notifyProjectMembersSoulsGameStatus(supabase, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    projectSlug: input.projectSlug,
    projectName: input.projectName,
    title,
    body,
    metadata: {
      type: "souls_docs_sync",
      trigger: input.trigger ?? "manual",
      lore_doc_path: input.loreDocPath,
      lore_doc_committed: input.loreDocCommitted,
      game_status_committed: input.gameStatusCommitted,
      game_status_error: input.gameStatusError ?? null,
    },
  })
}
