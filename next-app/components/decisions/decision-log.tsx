"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { Gavel, Plus, Sparkles } from "lucide-react"

import { createDecision, seedStarterDecisions } from "@/lib/actions/decisions"
import type { DecisionWithOwner, ProjectMemberWithProfile } from "@/lib/database.types"
import { DECISION_STATUSES, DECISION_STATUS_LABELS } from "@/lib/constants/decisions"
import { slugify } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type DecisionLogProps = {
  workspaceId: string
  projectId: string
  slug: string
  decisions: DecisionWithOwner[]
  members: ProjectMemberWithProfile[]
  canEdit: boolean
}

function CreateDecisionForm({
  workspaceId,
  projectId,
  slug,
  members,
  onSuccess,
}: {
  workspaceId: string
  projectId: string
  slug: string
  members: ProjectMemberWithProfile[]
  onSuccess?: () => void
}) {
  const [state, formAction, pending] = useActionState(createDecision, {})
  const [title, setTitle] = useState("")
  const [decisionSlug, setDecisionSlug] = useState("")

  useEffect(() => {
    if (state.success) {
      onSuccess?.()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="slug" value={slug} />
      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (!decisionSlug) {
              setDecisionSlug(slugify(event.target.value))
            }
          }}
          placeholder="Grid vs Tetris Inventory"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="decisionSlug">Slug</Label>
        <Input
          id="decisionSlug"
          name="decisionSlug"
          value={decisionSlug}
          onChange={(event) => setDecisionSlug(event.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            {DECISION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {DECISION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerId">Owner</Label>
          <select
            id="ownerId"
            name="ownerId"
            className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profile?.display_name ?? member.user_id}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="context">Context</Label>
        <Textarea id="context" name="context" rows={2} placeholder="Why does this decision matter?" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="problem">Problem</Label>
        <Textarea id="problem" name="problem" rows={2} placeholder="What needs to be decided?" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create decision"}
      </Button>
    </form>
  )
}

export function DecisionLog({
  workspaceId,
  projectId,
  slug,
  decisions,
  members,
  canEdit,
}: DecisionLogProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [seedState, seedAction, seeding] = useActionState(seedStarterDecisions, {})

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {decisions.length} decision{decisions.length === 1 ? "" : "s"}
        </p>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {decisions.length === 0 ? (
              <form action={seedAction}>
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="slug" value={slug} />
                <Button type="submit" variant="outline" disabled={seeding}>
                  <Sparkles className="size-4" />
                  {seeding ? "Seeding…" : "Seed starters"}
                </Button>
              </form>
            ) : null}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  New decision
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Log a decision</DialogTitle>
                </DialogHeader>
                <CreateDecisionForm
                  workspaceId={workspaceId}
                  projectId={projectId}
                  slug={slug}
                  members={members}
                  onSuccess={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      {seedState.success ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {seedState.success}
        </p>
      ) : null}

      {decisions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <Gavel className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">No decisions logged yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Record design and production choices with context, options, and outcomes.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {decisions.map((decision) => (
            <Link
              key={decision.id}
              href={`/projects/${slug}/decisions/${decision.slug}`}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{decision.title}</h3>
                  {decision.problem ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {decision.problem}
                    </p>
                  ) : null}
                  {decision.selected_option ? (
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">Outcome: </span>
                      {decision.selected_option}
                    </p>
                  ) : null}
                </div>
                <Badge variant="secondary">{DECISION_STATUS_LABELS[decision.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
