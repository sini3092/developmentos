"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  buildDraftId,
  deleteDraft,
  getDraft,
  saveDraft,
  type DraftEntry,
  type DraftKind,
} from "@/lib/pwa/draft-store"

type UseDraftComposerOptions = {
  kind: DraftKind
  contextId: string
  metadata: Record<string, string>
  enabled?: boolean
}

export function useDraftComposer({
  kind,
  contextId,
  metadata,
  enabled = true,
}: UseDraftComposerOptions) {
  const draftId = buildDraftId(kind, contextId)
  const [value, setValue] = useState("")
  const [ready, setReady] = useState(false)
  const [queued, setQueued] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled) {
      return
    }

    getDraft(draftId).then((draft) => {
      if (draft?.body) {
        setValue(draft.body)
        setQueued(draft.status === "pending" || draft.status === "failed")
      }
      setReady(true)
    })
  }, [draftId, enabled])

  useEffect(() => {
    if (!ready || !enabled) {
      return
    }

    if (!value.trim()) {
      void deleteDraft(draftId)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      void saveDraft({
        id: draftId,
        kind,
        contextId,
        body: value,
        metadata,
        updatedAt: Date.now(),
        status: "draft",
      })
    }, 400)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, ready, draftId, kind, contextId, metadata, enabled])

  const clearDraft = useCallback(async () => {
    setValue("")
    setQueued(false)
    await deleteDraft(draftId)
  }, [draftId])

  const queueOffline = useCallback(async () => {
    const body = value.trim()
    if (!body) {
      return false
    }

    const entry: DraftEntry = {
      id: draftId,
      kind,
      contextId,
      body,
      metadata,
      updatedAt: Date.now(),
      status: "pending",
    }

    await saveDraft(entry)
    setQueued(true)
    setValue("")
    return true
  }, [draftId, kind, contextId, metadata, value])

  return {
    value,
    setValue,
    ready,
    queued,
    clearDraft,
    queueOffline,
  }
}
