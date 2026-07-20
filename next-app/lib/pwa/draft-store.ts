export type DraftKind = "channel_message" | "channel_reply" | "task_comment"

export type DraftEntry = {
  id: string
  kind: DraftKind
  contextId: string
  body: string
  metadata: Record<string, string>
  updatedAt: number
  status: "draft" | "pending" | "failed"
  error?: string
}

const DB_NAME = "developmentos-drafts"
const DB_VERSION = 1
const STORE_NAME = "drafts"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        store.createIndex("status", "status", { unique: false })
        store.createIndex("kind", "kind", { unique: false })
      }
    }
  })
}

export function buildDraftId(kind: DraftKind, contextId: string) {
  return `${kind}:${contextId}`
}

export async function getDraft(id: string): Promise<DraftEntry | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const request = tx.objectStore(STORE_NAME).get(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as DraftEntry | undefined) ?? null)
  })
}

export async function saveDraft(entry: DraftEntry): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const request = tx.objectStore(STORE_NAME).put(entry)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const request = tx.objectStore(STORE_NAME).delete(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function listPendingDrafts(): Promise<DraftEntry[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const request = tx.objectStore(STORE_NAME).index("status").getAll("pending")
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve((request.result as DraftEntry[]) ?? [])
  })
}

export async function countPendingDrafts(): Promise<number> {
  const drafts = await listPendingDrafts()
  return drafts.length
}
