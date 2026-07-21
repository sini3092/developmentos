"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { createBoardList } from "@/lib/actions/board-lists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type AddBoardListProps = {
  slug: string
  projectId: string
  canEdit: boolean
  inline?: boolean
}

export function AddBoardList({ slug, projectId, canEdit, inline = false }: AddBoardListProps) {
  const router = useRouter()
  const [open, setOpen] = useState(inline)
  const [name, setName] = useState("")
  const [pending, startTransition] = useTransition()

  if (!canEdit) {
    return null
  }

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return

    startTransition(async () => {
      const result = await createBoardList(slug, projectId, trimmed)
      if (!result.error) {
        setName("")
        setOpen(inline)
        router.refresh()
      }
    })
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className="h-auto min-h-[28rem] w-full flex-col items-start justify-start rounded-xl border-dashed bg-surface-raised/30 p-4 text-left text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        + Add a list
      </Button>
    )
  }

  return (
    <div
      className={
        inline
          ? "rounded-xl border border-border/60 bg-card p-4 text-left"
          : "flex min-h-[28rem] flex-col rounded-xl border border-border/60 bg-surface-raised/50 p-3"
      }
    >
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="List name, e.g. Bugs"
        className="mb-2"
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Enter") handleCreate()
          if (event.key === "Escape") {
            setOpen(inline ? true : false)
            setName("")
          }
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreate} disabled={pending || !name.trim()}>
          Add list
        </Button>
        {!inline ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setOpen(false)
              setName("")
            }}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}
