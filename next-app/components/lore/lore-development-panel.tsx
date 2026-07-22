"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { Boxes, Hammer, Link2, Milestone, Target, X } from "lucide-react"

import {
  createTaskFromLore,
  linkLoreDevelopment,
  unlinkLoreDevelopment,
  unlinkLoreTask,
  updateLoreImplementationStatus,
} from "@/lib/actions/lore-development"
import type {
  LoreDevelopmentConnections,
  LoreDevelopmentOptions,
} from "@/lib/auth/lore-development-context"
import {
  LORE_IMPLEMENTATION_STATUS_LABELS,
  LORE_IMPLEMENTATION_STATUSES,
} from "@/lib/constants/lore-implementation"
import type { BoardList, LoreEntry, LoreImplementationStatus } from "@/lib/database.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LoreDevelopmentPanelProps = {
  entry: Pick<LoreEntry, "id" | "slug" | "name" | "implementation_status">
  slug: string
  projectId: string
  connections: LoreDevelopmentConnections
  options: LoreDevelopmentOptions
  boardLists: BoardList[]
  canEdit: boolean
}

function ConnectionRow({
  href,
  title,
  meta,
  canEdit,
  unlinkAction,
  linkId,
  entryId,
  slug,
  entrySlug,
}: {
  href: string
  title: string
  meta?: string
  canEdit: boolean
  unlinkAction: typeof unlinkLoreDevelopment
  linkId: string
  entryId: string
  slug: string
  entrySlug: string
}) {
  const [, action, pending] = useActionState(unlinkAction, {})

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
      <div className="min-w-0">
        <Link href={href} className="font-medium hover:text-info">
          {title}
        </Link>
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      {canEdit ? (
        <form action={action}>
          <input type="hidden" name="linkId" value={linkId} />
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="entrySlug" value={entrySlug} />
          <Button type="submit" size="icon-sm" variant="ghost" disabled={pending}>
            <X className="size-3.5" />
          </Button>
        </form>
      ) : null}
    </div>
  )
}

export function LoreDevelopmentPanel({
  entry,
  slug,
  projectId,
  connections,
  options,
  boardLists,
  canEdit,
}: LoreDevelopmentPanelProps) {
  const [statusState, statusAction, statusPending] = useActionState(
    updateLoreImplementationStatus,
    {}
  )
  const [taskState, taskAction, taskPending] = useActionState(createTaskFromLore, {})
  const [assetState, assetAction, assetPending] = useActionState(linkLoreDevelopment, {})
  const [initiativeState, initiativeAction, initiativePending] = useActionState(
    linkLoreDevelopment,
    {}
  )
  const [milestoneState, milestoneAction, milestonePending] = useActionState(
    linkLoreDevelopment,
    {}
  )
  const [showCreateTask, setShowCreateTask] = useState(false)

  useEffect(() => {
    if (taskState.success) {
      setShowCreateTask(false)
    }
  }, [taskState.success])

  const linkedAssetIds = new Set(connections.assets.map((asset) => asset.id))
  const linkedInitiativeIds = new Set(connections.initiatives.map((item) => item.id))
  const linkedMilestoneIds = new Set(connections.milestones.map((item) => item.id))

  const availableAssets = options.assets.filter((asset) => !linkedAssetIds.has(asset.id))
  const availableInitiatives = options.initiatives.filter(
    (item) => !linkedInitiativeIds.has(item.id)
  )
  const availableMilestones = options.milestones.filter(
    (item) => !linkedMilestoneIds.has(item.id)
  )

  const hasConnections =
    connections.tasks.length > 0 ||
    connections.assets.length > 0 ||
    connections.initiatives.length > 0 ||
    connections.milestones.length > 0

  if (!canEdit && !hasConnections) {
    return null
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Hammer className="size-4" />
        Development
      </h3>

      <form action={statusAction} className="mt-3 space-y-2">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="entrySlug" value={entry.slug} />
        <Label htmlFor="implementationStatus" className="text-xs">
          Implementation status
        </Label>
        <div className="flex gap-2">
          <select
            id="implementationStatus"
            name="implementationStatus"
            defaultValue={entry.implementation_status}
            disabled={!canEdit}
            className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            {LORE_IMPLEMENTATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LORE_IMPLEMENTATION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {canEdit ? (
            <Button type="submit" size="sm" variant="outline" disabled={statusPending}>
              Save
            </Button>
          ) : null}
        </div>
        {statusState.error ? <p className="text-xs text-danger">{statusState.error}</p> : null}
        {statusState.success ? <p className="text-xs text-success">{statusState.success}</p> : null}
      </form>

      <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Linked tasks</p>
            {canEdit ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowCreateTask((value) => !value)}
              >
                {showCreateTask ? "Cancel" : "Create task"}
              </Button>
            ) : null}
          </div>

          {showCreateTask && canEdit ? (
            <form action={taskAction} className="space-y-3 rounded-lg border border-border/60 p-3">
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="entryId" value={entry.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="entrySlug" value={entry.slug} />
              <input type="hidden" name="entryName" value={entry.name} />
              <div className="space-y-1">
                <Label htmlFor="task-title" className="text-xs">
                  Task title
                </Label>
                <Input
                  id="task-title"
                  name="title"
                  defaultValue={`Implement: ${entry.name}`}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="task-description" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="task-description"
                  name="description"
                  rows={2}
                  placeholder="What needs to be built to reflect this lore?"
                />
              </div>
              {boardLists.length > 0 ? (
                <div className="space-y-1">
                  <Label htmlFor="listId" className="text-xs">
                    Board list
                  </Label>
                  <select
                    id="listId"
                    name="listId"
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    defaultValue={boardLists[0]?.id}
                  >
                    {boardLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {availableMilestones.length > 0 ? (
                <div className="space-y-1">
                  <Label htmlFor="milestoneId" className="text-xs">
                    Milestone (optional)
                  </Label>
                  <select
                    id="milestoneId"
                    name="milestoneId"
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    defaultValue=""
                  >
                    <option value="">None</option>
                    {availableMilestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {availableInitiatives.length > 0 ? (
                <div className="space-y-1">
                  <Label htmlFor="initiativeId" className="text-xs">
                    Initiative (optional)
                  </Label>
                  <select
                    id="initiativeId"
                    name="initiativeId"
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    defaultValue=""
                  >
                    <option value="">None</option>
                    {availableInitiatives.map((initiative) => (
                      <option key={initiative.id} value={initiative.id}>
                        {initiative.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {taskState.error ? <p className="text-xs text-danger">{taskState.error}</p> : null}
              {taskState.success ? <p className="text-xs text-success">{taskState.success}</p> : null}
              <Button type="submit" size="sm" disabled={taskPending || boardLists.length === 0}>
                {taskPending ? "Creating…" : "Create linked task"}
              </Button>
            </form>
          ) : null}

          {connections.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No linked tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {connections.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  slug={slug}
                  entryId={entry.id}
                  entrySlug={entry.slug}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}
        </div>

        {canEdit && availableAssets.length > 0 ? (
          <LinkForm
            label="Link asset"
            icon={Boxes}
            entryId={entry.id}
            slug={slug}
            entrySlug={entry.slug}
            linkType="asset"
            options={availableAssets}
            action={assetAction}
            pending={assetPending}
            state={assetState}
          />
        ) : null}

        {canEdit && availableInitiatives.length > 0 ? (
          <LinkForm
            label="Link initiative"
            icon={Target}
            entryId={entry.id}
            slug={slug}
            entrySlug={entry.slug}
            linkType="initiative"
            options={availableInitiatives}
            action={initiativeAction}
            pending={initiativePending}
            state={initiativeState}
          />
        ) : null}

        {canEdit && availableMilestones.length > 0 ? (
          <LinkForm
            label="Link milestone"
            icon={Milestone}
            entryId={entry.id}
            slug={slug}
            entrySlug={entry.slug}
            linkType="milestone"
            options={availableMilestones}
            action={milestoneAction}
            pending={milestonePending}
            state={milestoneState}
          />
        ) : null}

        {connections.assets.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Assets</p>
            {connections.assets.map((asset) => (
              <ConnectionRow
                key={asset.id}
                href={`/projects/${slug}/assets/${asset.slug}`}
                title={asset.name}
                canEdit={canEdit}
                unlinkAction={unlinkLoreDevelopment}
                linkId={asset.link_id}
                entryId={entry.id}
                slug={slug}
                entrySlug={entry.slug}
              />
            ))}
          </div>
        ) : null}

        {connections.initiatives.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Initiatives</p>
            {connections.initiatives.map((initiative) => (
              <ConnectionRow
                key={initiative.id}
                href={`/projects/${slug}/roadmap/${initiative.slug}`}
                title={initiative.name}
                canEdit={canEdit}
                unlinkAction={unlinkLoreDevelopment}
                linkId={initiative.link_id}
                entryId={entry.id}
                slug={slug}
                entrySlug={entry.slug}
              />
            ))}
          </div>
        ) : null}

        {connections.milestones.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Milestones</p>
            {connections.milestones.map((milestone) => (
              <ConnectionRow
                key={milestone.id}
                href={`/projects/${slug}/roadmap/milestones/${milestone.slug}`}
                title={milestone.name}
                canEdit={canEdit}
                unlinkAction={unlinkLoreDevelopment}
                linkId={milestone.link_id}
                entryId={entry.id}
                slug={slug}
                entrySlug={entry.slug}
              />
            ))}
          </div>
        ) : null}

        {!hasConnections && !canEdit ? (
          <p className="text-xs text-muted-foreground">No development links yet.</p>
        ) : null}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  slug,
  entryId,
  entrySlug,
  canEdit,
}: {
  task: LoreDevelopmentConnections["tasks"][number]
  slug: string
  entryId: string
  entrySlug: string
  canEdit: boolean
}) {
  const [, action, pending] = useActionState(unlinkLoreTask, {})

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm">
      <div className="min-w-0">
        <Link
          href={`/projects/${slug}/tasks/board?task=${task.id}`}
          className="font-medium hover:text-info"
        >
          {task.identifier} · {task.title}
        </Link>
        <Badge variant="outline" className="mt-1 font-normal">
          {task.status.replace(/_/g, " ")}
        </Badge>
      </div>
      {canEdit ? (
        <form action={action}>
          <input type="hidden" name="linkId" value={task.link_id} />
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="entrySlug" value={entrySlug} />
          <Button type="submit" size="icon-sm" variant="ghost" disabled={pending}>
            <X className="size-3.5" />
          </Button>
        </form>
      ) : null}
    </div>
  )
}

function LinkForm({
  label,
  icon: Icon,
  entryId,
  slug,
  entrySlug,
  linkType,
  options,
  action,
  pending,
  state,
}: {
  label: string
  icon: typeof Link2
  entryId: string
  slug: string
  entrySlug: string
  linkType: "asset" | "initiative" | "milestone"
  options: Array<{ id: string; name: string }>
  action: (formData: FormData) => void
  pending: boolean
  state: { error?: string; success?: string }
}) {
  return (
    <form action={action} className="flex items-end gap-2">
      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="entrySlug" value={entrySlug} />
      <input type="hidden" name="linkType" value={linkType} />
      <div className="min-w-0 flex-1 space-y-1">
        <Label className="flex items-center gap-1.5 text-xs">
          <Icon className="size-3.5" />
          {label}
        </Label>
        <select
          name="linkedId"
          required
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select…
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Link
      </Button>
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  )
}
