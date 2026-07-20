"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useTransition } from "react"
import { Download, Paperclip, Trash2 } from "lucide-react"

import {
  deleteTaskAttachment,
  getTaskAttachmentUrl,
  uploadTaskAttachment,
} from "@/lib/actions/attachments"
import type { TaskDetail } from "@/lib/auth/task-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TaskAttachmentsSectionProps = {
  task: Pick<TaskDetail, "id" | "attachments">
  slug: string
  canEdit: boolean
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function TaskAttachmentsSection({ task, slug, canEdit }: TaskAttachmentsSectionProps) {
  const router = useRouter()
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadTaskAttachment, {})
  const [isDeleting, startDelete] = useTransition()

  useEffect(() => {
    if (uploadState.success) {
      router.refresh()
    }
  }, [uploadState.success, router])

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Paperclip className="size-4" />
        Attachments ({task.attachments.length})
      </h3>

      {task.attachments.length > 0 ? (
        <ul className="space-y-2">
          {task.attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface-raised/30 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                  {attachment.uploader ? ` · ${attachment.uploader.display_name}` : null}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={async () => {
                    const result = await getTaskAttachmentUrl(attachment.id)
                    if (result.url) {
                      window.open(result.url, "_blank", "noopener,noreferrer")
                    }
                  }}
                >
                  <Download className="size-3.5" />
                </Button>
                {canEdit ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-danger"
                    disabled={isDeleting}
                    onClick={() => {
                      startDelete(async () => {
                        await deleteTaskAttachment(attachment.id, slug)
                        router.refresh()
                      })
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No files attached.</p>
      )}

      {canEdit ? (
        <form action={uploadAction} className="space-y-2">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="slug" value={slug} />
          <Input name="file" type="file" required />
          {uploadState.error ? <p className="text-sm text-danger">{uploadState.error}</p> : null}
          <Button type="submit" size="sm" disabled={uploadPending}>
            {uploadPending ? "Uploading..." : "Upload file"}
          </Button>
        </form>
      ) : null}
    </section>
  )
}
