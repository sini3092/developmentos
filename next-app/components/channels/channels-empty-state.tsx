"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import { seedProjectChannels } from "@/lib/actions/channels"
import { Button } from "@/components/ui/button"

type ChannelsEmptyStateProps = {
  projectId: string
  slug: string
  canEdit: boolean
}

export function ChannelsEmptyState({ projectId, slug, canEdit }: ChannelsEmptyStateProps) {
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    await seedProjectChannels(projectId, slug)
    setSeeding(false)
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
        <h2 className="text-sm font-medium">No channels yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Seed starter channels for general discussion, gameplay, art, and more.
        </p>
        {canEdit ? (
          <Button className="mt-4" variant="outline" onClick={handleSeed} disabled={seeding}>
            <Sparkles className="size-4" />
            {seeding ? "Seeding…" : "Seed starter channels"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
