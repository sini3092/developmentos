"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ArrowLeft, ListTodo } from "lucide-react"

import { linkAssetTask, unlinkAssetTask, updateAsset } from "@/lib/actions/assets"
import type { AssetDetail, ProjectMemberWithProfile, Task } from "@/lib/database.types"
import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
} from "@/lib/constants/assets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type AssetDetailEditorProps = {
  asset: AssetDetail
  slug: string
  members: ProjectMemberWithProfile[]
  projectTasks: Array<Pick<Task, "id" | "title" | "identifier">>
  canEdit: boolean
}

export function AssetDetailHeader({ slug }: { slug: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/projects/${slug}/assets`}>
        <ArrowLeft className="size-4" />
        Back to assets
      </Link>
    </Button>
  )
}

export function AssetDetailEditor({
  asset,
  slug,
  members,
  projectTasks,
  canEdit,
}: AssetDetailEditorProps) {
  const [state, formAction, pending] = useActionState(updateAsset, {})
  const [linkState, linkAction, linking] = useActionState(linkAssetTask, {})
  const [, unlinkAction] = useActionState(unlinkAssetTask, {})
  const linkedTaskIds = new Set(asset.linked_tasks.map((task) => task.id))
  const availableTasks = projectTasks.filter((task) => !linkedTaskIds.has(task.id))

  if (!canEdit) {
    return (
      <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
          {asset.description ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{asset.description}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}
        </article>
        <aside className="space-y-4">
          <AssetMetaCard asset={asset} />
          <LinkedTasksCard asset={asset} slug={slug} canEdit={false} unlinkAction={unlinkAction} />
        </aside>
      </div>
    )
  }

  return (
    <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={formAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-xs">
        <input type="hidden" name="assetId" value={asset.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="assetSlug" value={asset.slug} />
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
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={asset.name} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="assetType">Type</Label>
            <select
              id="assetType"
              name="assetType"
              defaultValue={asset.asset_type}
              className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {ASSET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ASSET_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={asset.status}
              className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {ASSET_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ASSET_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input id="version" name="version" defaultValue={asset.version} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerId">Owner</Label>
            <select
              id="ownerId"
              name="ownerId"
              defaultValue={asset.owner_id ?? ""}
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
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={3} defaultValue={asset.description ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input id="tags" name="tags" defaultValue={asset.tags.join(", ")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourcePath">Source path</Label>
          <Input id="sourcePath" name="sourcePath" defaultValue={asset.source_path ?? ""} placeholder="DCC or repo path" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exportPath">Export path</Label>
          <Input id="exportPath" name="exportPath" defaultValue={asset.export_path ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="enginePath">Engine path</Label>
          <Input id="enginePath" name="enginePath" defaultValue={asset.engine_path ?? ""} placeholder="Content/..." />
        </div>
        <div className="space-y-2">
          <Label htmlFor="previewUrl">Preview URL</Label>
          <Input id="previewUrl" name="previewUrl" defaultValue={asset.preview_url ?? ""} placeholder="Optional thumbnail or preview link" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <aside className="space-y-4">
        <AssetMetaCard asset={asset} />
        <LinkedTasksCard asset={asset} slug={slug} canEdit unlinkAction={unlinkAction} />
        {availableTasks.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
            <h3 className="text-sm font-medium">Link task</h3>
            {linkState.error ? (
              <p className="mt-2 text-sm text-danger">{linkState.error}</p>
            ) : null}
            {linkState.success ? (
              <p className="mt-2 text-sm text-success">{linkState.success}</p>
            ) : null}
            <form action={linkAction} className="mt-3 space-y-3">
              <input type="hidden" name="assetId" value={asset.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="assetSlug" value={asset.slug} />
              <select
                name="taskId"
                className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                required
              >
                <option value="">Select task…</option>
                {availableTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.identifier} — {task.title}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline" disabled={linking}>
                {linking ? "Linking…" : "Link task"}
              </Button>
            </form>
          </div>
        ) : null}
      </aside>
    </div>
  )
}

function AssetMetaCard({ asset }: { asset: AssetDetail }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="text-sm font-medium">Details</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">{ASSET_TYPE_LABELS[asset.asset_type]}</Badge>
        <Badge variant="secondary">{ASSET_STATUS_LABELS[asset.status]}</Badge>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Version</dt>
          <dd>{asset.version}</dd>
        </div>
        {asset.owner ? (
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd>{asset.owner.display_name}</dd>
          </div>
        ) : null}
        {asset.engine_path ? (
          <div>
            <dt className="text-muted-foreground">Engine path</dt>
            <dd className="break-all font-mono text-xs">{asset.engine_path}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

function LinkedTasksCard({
  asset,
  slug,
  canEdit,
  unlinkAction,
}: {
  asset: AssetDetail
  slug: string
  canEdit: boolean
  unlinkAction?: (payload: FormData) => void
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <ListTodo className="size-4" />
        Related tasks
      </h3>
      {asset.linked_tasks.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No linked tasks.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {asset.linked_tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
              <Link
                href={`/projects/${slug}/tasks?task=${task.id}`}
                className="truncate hover:underline"
              >
                {task.identifier} — {task.title}
              </Link>
              {canEdit && unlinkAction ? (
                <form action={unlinkAction}>
                  <input type="hidden" name="assetId" value={asset.id} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="assetSlug" value={asset.slug} />
                  <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    Remove
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
