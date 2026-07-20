"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import type { LucideIcon } from "lucide-react"
import { BookOpen, Boxes, Link2, ScrollText, X } from "lucide-react"

import {
  linkTaskAsset,
  linkTaskDecision,
  linkTaskReference,
  unlinkTaskAsset,
  unlinkTaskDecision,
  unlinkTaskReference,
} from "@/lib/actions/task-connections"
import type { TaskDetail } from "@/lib/auth/task-context"
import type { ProjectTaskLinkOptions } from "@/lib/auth/task-link-options"
import { ASSET_TYPE_LABELS } from "@/lib/constants/assets"
import { DECISION_STATUS_LABELS } from "@/lib/constants/decisions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type TaskConnectionsSectionProps = {
  task: Pick<
    TaskDetail,
    | "id"
    | "linked_assets"
    | "linked_decisions"
    | "linked_design_documents"
    | "linked_lore_entries"
  >
  slug: string
  linkOptions: ProjectTaskLinkOptions
  canEdit: boolean
}

export function TaskConnectionsSection({
  task,
  slug,
  linkOptions,
  canEdit,
}: TaskConnectionsSectionProps) {
  const router = useRouter()
  const [assetState, assetAction, assetPending] = useActionState(linkTaskAsset, {})
  const [decisionState, decisionAction, decisionPending] = useActionState(linkTaskDecision, {})
  const [designState, designAction, designPending] = useActionState(linkTaskReference, {})
  const [loreState, loreAction, lorePending] = useActionState(linkTaskReference, {})
  const [, unlinkAssetAction] = useActionState(unlinkTaskAsset, {})
  const [, unlinkDecisionAction] = useActionState(unlinkTaskDecision, {})
  const [, unlinkReferenceAction] = useActionState(unlinkTaskReference, {})

  useEffect(() => {
    if (assetState.success || decisionState.success || designState.success || loreState.success) {
      router.refresh()
    }
  }, [assetState.success, decisionState.success, designState.success, loreState.success, router])

  const linkedAssetIds = new Set(task.linked_assets.map((asset) => asset.id))
  const linkedDecisionIds = new Set(task.linked_decisions.map((decision) => decision.id))
  const linkedDesignIds = new Set(task.linked_design_documents.map((document) => document.id))
  const linkedLoreIds = new Set(task.linked_lore_entries.map((entry) => entry.id))

  const availableAssets = linkOptions.assets.filter((asset) => !linkedAssetIds.has(asset.id))
  const availableDecisions = linkOptions.decisions.filter(
    (decision) => !linkedDecisionIds.has(decision.id)
  )
  const availableDesignDocs = linkOptions.designDocuments.filter(
    (document) => !linkedDesignIds.has(document.id)
  )
  const availableLoreEntries = linkOptions.loreEntries.filter(
    (entry) => !linkedLoreIds.has(entry.id)
  )

  const hasConnections =
    task.linked_assets.length > 0 ||
    task.linked_decisions.length > 0 ||
    task.linked_design_documents.length > 0 ||
    task.linked_lore_entries.length > 0

  if (!canEdit && !hasConnections) {
    return null
  }

  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="size-4" />
        Connected references
      </h3>

      {task.linked_assets.length > 0 ? (
        <ConnectionGroup title="Assets" icon={Boxes}>
          {task.linked_assets.map((asset) => (
            <ConnectionItem
              key={asset.id}
              href={`/projects/${slug}/assets/${asset.slug}`}
              title={asset.name}
              meta={ASSET_TYPE_LABELS[asset.asset_type]}
              canEdit={canEdit}
              unlinkAction={unlinkAssetAction}
              unlinkFields={{
                taskId: task.id,
                assetId: asset.id,
                slug,
              }}
            />
          ))}
        </ConnectionGroup>
      ) : null}

      {task.linked_decisions.length > 0 ? (
        <ConnectionGroup title="Decisions" icon={ScrollText}>
          {task.linked_decisions.map((decision) => (
            <ConnectionItem
              key={decision.id}
              href={`/projects/${slug}/decisions/${decision.slug}`}
              title={decision.title}
              meta={DECISION_STATUS_LABELS[decision.status]}
              canEdit={canEdit}
              unlinkAction={unlinkDecisionAction}
              unlinkFields={{
                linkId: decision.link_id,
                slug,
              }}
            />
          ))}
        </ConnectionGroup>
      ) : null}

      {task.linked_design_documents.length > 0 ? (
        <ConnectionGroup title="Design docs" icon={BookOpen}>
          {task.linked_design_documents.map((document) => (
            <ConnectionItem
              key={document.id}
              href={`/projects/${slug}/design/${document.slug}`}
              title={document.title}
              meta={document.status.replace("_", " ")}
              canEdit={canEdit}
              unlinkAction={unlinkReferenceAction}
              unlinkFields={{
                linkId: document.link_id,
                slug,
              }}
            />
          ))}
        </ConnectionGroup>
      ) : null}

      {task.linked_lore_entries.length > 0 ? (
        <ConnectionGroup title="Lore" icon={BookOpen}>
          {task.linked_lore_entries.map((entry) => (
            <ConnectionItem
              key={entry.id}
              href={`/projects/${slug}/lore/${entry.slug}`}
              title={entry.name}
              meta={entry.canon_status.replace("_", " ")}
              canEdit={canEdit}
              unlinkAction={unlinkReferenceAction}
              unlinkFields={{
                linkId: entry.link_id,
                slug,
              }}
            />
          ))}
        </ConnectionGroup>
      ) : null}

      {!hasConnections && !canEdit ? null : null}

      {canEdit ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {availableAssets.length > 0 ? (
            <LinkForm
              action={assetAction}
              pending={assetPending}
              label="Link asset"
              fieldName="assetId"
              options={availableAssets}
              hiddenFields={{ taskId: task.id, slug }}
              error={assetState.error}
            />
          ) : null}

          {availableDecisions.length > 0 ? (
            <LinkForm
              action={decisionAction}
              pending={decisionPending}
              label="Link decision"
              fieldName="decisionId"
              options={availableDecisions}
              hiddenFields={{ taskId: task.id, slug }}
              error={decisionState.error}
            />
          ) : null}

          {availableDesignDocs.length > 0 ? (
            <LinkForm
              action={designAction}
              pending={designPending}
              label="Link design doc"
              fieldName="referenceId"
              options={availableDesignDocs}
              hiddenFields={{
                taskId: task.id,
                slug,
                referenceType: "design_document",
              }}
              error={designState.error}
            />
          ) : null}

          {availableLoreEntries.length > 0 ? (
            <LinkForm
              action={loreAction}
              pending={lorePending}
              label="Link lore entry"
              fieldName="referenceId"
              options={availableLoreEntries}
              hiddenFields={{
                taskId: task.id,
                slug,
                referenceType: "lore_entry",
              }}
              error={loreState.error}
            />
          ) : null}
        </div>
      ) : null}

      {!hasConnections && canEdit ? (
        <p className="text-sm text-muted-foreground">
          Link assets, decisions, design docs, and lore entries to keep this task connected to the
          rest of the project.
        </p>
      ) : null}
    </div>
  )
}

function ConnectionGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function ConnectionItem({
  href,
  title,
  meta,
  canEdit,
  unlinkAction,
  unlinkFields,
}: {
  href: string
  title: string
  meta: string
  canEdit: boolean
  unlinkAction: (formData: FormData) => void
  unlinkFields: Record<string, string>
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-raised/30 px-3 py-2">
      <div className="min-w-0">
        <Link href={href} className="truncate text-sm font-medium hover:text-info">
          {title}
        </Link>
        <Badge variant="outline" className="mt-1 text-[10px] capitalize">
          {meta}
        </Badge>
      </div>
      {canEdit ? (
        <form action={unlinkAction}>
          {Object.entries(unlinkFields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <Button type="submit" size="icon" variant="ghost" className="size-7 shrink-0">
            <X className="size-3.5" />
          </Button>
        </form>
      ) : null}
    </div>
  )
}

function LinkForm({
  action,
  pending,
  label,
  fieldName,
  options,
  hiddenFields,
  error,
}: {
  action: (formData: FormData) => void
  pending: boolean
  label: string
  fieldName: string
  options: Array<{ id: string; label: string }>
  hiddenFields: Record<string, string>
  error?: string
}) {
  return (
    <form action={action} className="space-y-2 rounded-lg border border-border/60 p-3">
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <select
          name={fieldName}
          required
          className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select…
          </option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "…" : "Link"}
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </form>
  )
}
