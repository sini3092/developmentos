import { postChannelMessage } from "@/lib/actions/channels"
import { addTaskComment } from "@/lib/actions/tasks"
import {
  deleteDraft,
  listPendingDrafts,
  saveDraft,
  type DraftEntry,
} from "@/lib/pwa/draft-store"

function buildFormData(entry: DraftEntry) {
  const formData = new FormData()
  formData.set("body", entry.body)

  for (const [key, value] of Object.entries(entry.metadata)) {
    formData.set(key, value)
  }

  return formData
}

async function submitDraft(entry: DraftEntry) {
  const formData = buildFormData(entry)

  if (entry.kind === "task_comment") {
    return addTaskComment({}, formData)
  }

  return postChannelMessage({}, formData)
}

export async function syncPendingDrafts() {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 }
  }

  const pending = await listPendingDrafts()
  let synced = 0
  let failed = 0

  for (const entry of pending) {
    const result = await submitDraft(entry)

    if (result.error) {
      failed += 1
      await saveDraft({
        ...entry,
        status: "failed",
        error: result.error,
      })
      continue
    }

    await deleteDraft(entry.id)
    synced += 1
  }

  return { synced, failed }
}
