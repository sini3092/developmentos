"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell, Trash2 } from "lucide-react"

import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from "@/lib/actions/calendar"
import type { CalendarEvent } from "@/lib/auth/calendar-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CalendarEventDialogProps = {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
  event?: CalendarEvent | null
}

function CalendarEventForm({
  workspaceId,
  defaultDate,
  event,
  onSuccess,
  onDelete,
}: {
  workspaceId: string
  defaultDate: string
  event?: CalendarEvent | null
  onSuccess: () => void
  onDelete?: () => void
}) {
  const isEditing = event?.type === "personal"
  const [state, formAction, pending] = useActionState(
    isEditing ? updateCalendarEvent : createCalendarEvent,
    {}
  )
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (state.success) {
      onSuccess()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {isEditing ? <input type="hidden" name="eventId" value={event.id} /> : null}

      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="calendar-event-title">What do you want to do?</Label>
        <Input
          id="calendar-event-title"
          name="title"
          defaultValue={event?.title ?? ""}
          placeholder="Playtest combat, review lore, ship build..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="calendar-event-date">Date</Label>
        <Input
          id="calendar-event-date"
          name="eventDate"
          type="date"
          defaultValue={event?.date ?? defaultDate}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="calendar-event-description">Notes (optional)</Label>
        <Textarea
          id="calendar-event-description"
          name="description"
          defaultValue={event?.description ?? ""}
          rows={3}
          placeholder="Extra context for yourself"
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-surface-raised/40 px-3 py-3">
        <input
          type="checkbox"
          name="notifyOnDay"
          defaultChecked={event?.notifyOnDay ?? true}
          className="mt-0.5 size-4 rounded border-input"
        />
        <span className="space-y-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Bell className="size-4" />
            Remind me on this day
          </span>
          <span className="block text-xs text-muted-foreground">
            You&apos;ll get an inbox notification and push alert when the day arrives.
          </span>
        </span>
      </label>

      <div className="flex items-center justify-between gap-3 pt-2">
        {isEditing ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-danger"
            disabled={pending || isDeleting}
            onClick={async () => {
              setIsDeleting(true)
              const result = await deleteCalendarEvent(event.id)
              setIsDeleting(false)
              if (!result.error) {
                onDelete?.()
              }
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="sm" disabled={pending || isDeleting}>
          {pending ? "Saving…" : isEditing ? "Save changes" : "Add to calendar"}
        </Button>
      </div>
    </form>
  )
}

export function CalendarEventDialog({
  workspaceId,
  open,
  onOpenChange,
  defaultDate,
  event,
}: CalendarEventDialogProps) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)

  function handleSuccess() {
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event?.type === "personal" ? "Edit calendar item" : "Add to calendar"}</DialogTitle>
          <DialogDescription>
            Personal reminders stay on your calendar and notify you on the scheduled day.
          </DialogDescription>
        </DialogHeader>
        <CalendarEventForm
          key={`${event?.id ?? "new"}-${defaultDate ?? today}-${open ? "open" : "closed"}`}
          workspaceId={workspaceId}
          defaultDate={defaultDate ?? today}
          event={event}
          onSuccess={handleSuccess}
          onDelete={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
