"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { Box, Plus, Sparkles } from "lucide-react"

import { createAsset, seedStarterAssets } from "@/lib/actions/assets"
import type { AssetWithOwner, ProjectMemberWithProfile } from "@/lib/database.types"
import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
} from "@/lib/constants/assets"
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

type AssetLibraryProps = {
  workspaceId: string
  projectId: string
  slug: string
  assets: AssetWithOwner[]
  members: ProjectMemberWithProfile[]
  canEdit: boolean
}

function CreateAssetForm({
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
  const [state, formAction, pending] = useActionState(createAsset, {})
  const [name, setName] = useState("")
  const [assetSlug, setAssetSlug] = useState("")

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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (!assetSlug) {
              setAssetSlug(slugify(event.target.value))
            }
          }}
          placeholder="Iron Sword Model"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assetSlug">Slug</Label>
        <Input id="assetSlug" name="assetSlug" value={assetSlug} onChange={(e) => setAssetSlug(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assetType">Type</Label>
          <select
            id="assetType"
            name="assetType"
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
          <Input id="version" name="version" defaultValue="0.1" />
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
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} placeholder="What is this asset for?" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" name="tags" placeholder="weapon, starter, v1" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create asset"}
      </Button>
    </form>
  )
}

export function AssetLibrary({
  workspaceId,
  projectId,
  slug,
  assets,
  members,
  canEdit,
}: AssetLibraryProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [seedState, seedAction, seeding] = useActionState(seedStarterAssets, {})

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assets.length} asset{assets.length === 1 ? "" : "s"}
        </p>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {assets.length === 0 ? (
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
                  New asset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create asset</DialogTitle>
                </DialogHeader>
                <CreateAssetForm
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

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <Box className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">No assets tracked yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Track meshes, textures, audio, and other production assets with paths and status.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/projects/${slug}/assets/${asset.slug}`}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{asset.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    v{asset.version}
                    {asset.owner ? ` · ${asset.owner.display_name}` : ""}
                    {asset.engine_path ? ` · ${asset.engine_path}` : ""}
                  </p>
                  {asset.description ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {asset.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{ASSET_TYPE_LABELS[asset.asset_type]}</Badge>
                  <Badge variant="secondary">{ASSET_STATUS_LABELS[asset.status]}</Badge>
                </div>
              </div>
              {asset.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {asset.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
