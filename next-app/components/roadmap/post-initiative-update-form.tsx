"use client"

import { useActionState } from "react"

import { postInitiativeUpdate } from "@/lib/actions/roadmap"
import type { InitiativeHealth } from "@/lib/database.types"
import {
  INITIATIVE_HEALTH_OPTIONS,
  INITIATIVE_HEALTH_LABELS,
} from "@/lib/constants/roadmap"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type PostInitiativeUpdateFormProps = {
  initiativeId: string
  slug: string
  initiativeSlug: string
  currentHealth: InitiativeHealth
  currentProgress: number
}

export function PostInitiativeUpdateForm({
  initiativeId,
  slug,
  initiativeSlug,
  currentHealth,
  currentProgress,
}: PostInitiativeUpdateFormProps) {
  const [state, formAction, pending] = useActionState(postInitiativeUpdate, {})

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <div>
        <h3 className="font-medium">Post formal update</h3>
        <p className="text-sm text-muted-foreground">
          Record health, progress, and a structured status for stakeholders.
        </p>
      </div>
      <input type="hidden" name="initiativeId" value={initiativeId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="initiativeSlug" value={initiativeSlug} />
      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {state.success}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="health">Health</Label>
          <select
            id="health"
            name="health"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={currentHealth}
          >
            {INITIATIVE_HEALTH_OPTIONS.map((health) => (
              <option key={health} value={health}>
                {INITIATIVE_HEALTH_LABELS[health]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="progress">Progress (%)</Label>
          <Input
            id="progress"
            name="progress"
            type="number"
            min={0}
            max={100}
            defaultValue={currentProgress}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          name="summary"
          placeholder="One-line status headline."
          rows={2}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="accomplishments">Accomplishments</Label>
        <Textarea id="accomplishments" name="accomplishments" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="blockers">Blockers</Label>
        <Textarea id="blockers" name="blockers" rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nextSteps">Next steps</Label>
        <Textarea id="nextSteps" name="nextSteps" rows={2} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Posting…" : "Post update"}
      </Button>
    </form>
  )
}
