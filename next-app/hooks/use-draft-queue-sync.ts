"use client"

import { useEffect, useState } from "react"

import { countPendingDrafts, listPendingDrafts } from "@/lib/pwa/draft-store"
import { syncPendingDrafts } from "@/lib/pwa/sync-drafts"

export function useDraftQueueSync() {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<{ synced: number; failed: number } | null>(null)

  async function refreshCount() {
    const count = await countPendingDrafts()
    setPendingCount(count)
  }

  async function sync() {
    if (!navigator.onLine || syncing) {
      return
    }

    setSyncing(true)
    try {
      const result = await syncPendingDrafts()
      setLastSync(result)
      await refreshCount()
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    void refreshCount()

    if (navigator.onLine) {
      void sync()
    }

    function handleOnline() {
      void sync()
    }

    window.addEventListener("online", handleOnline)
    return () => window.removeEventListener("online", handleOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    pendingCount,
    syncing,
    lastSync,
    sync,
    refreshCount,
    hasPending: pendingCount > 0,
    pendingDrafts: listPendingDrafts,
  }
}
