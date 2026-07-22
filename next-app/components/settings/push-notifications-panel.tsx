"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { Bell, BellOff, BellRing } from "lucide-react"

import {
  removePushSubscription,
  savePushSubscription,
  updateNotificationPreferences,
} from "@/lib/actions/push"
import type { NotificationPreferences } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type PushNotificationsPanelProps = {
  preferences: NotificationPreferences | null
  subscriptionCount: number
  pushConfigured: boolean
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export function PushNotificationsPanel({
  preferences,
  subscriptionCount,
  pushConfigured,
}: PushNotificationsPanelProps) {
  const [state, formAction, pending] = useActionState(updateNotificationPreferences, {})
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [isSubscribing, startSubscribe] = useTransition()
  const [subscribed, setSubscribed] = useState(subscriptionCount > 0)

  useEffect(() => {
    setSubscribed(subscriptionCount > 0)
  }, [subscriptionCount])

  const prefs = preferences ?? {
    push_enabled: true,
    push_task_assigned: true,
    push_task_comment: true,
    push_task_blocked: true,
    push_roadmap_update: false,
    push_mentioned: true,
    push_calendar_reminder: true,
  }

  function handleEnablePush() {
    startSubscribe(async () => {
      setSubscribeError(null)

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setSubscribeError("Push notifications are not supported in this browser.")
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setSubscribeError("Notification permission was denied.")
        return
      }

      const keyResponse = await fetch("/api/push/vapid-public-key")
      const keyData = (await keyResponse.json()) as {
        configured?: boolean
        publicKey?: string
      }

      if (!keyData.configured || !keyData.publicKey) {
        setSubscribeError("Push is not configured on this server.")
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      })

      const result = await savePushSubscription(
        JSON.stringify(subscription.toJSON()),
        navigator.userAgent
      )

      if (result.error) {
        setSubscribeError(result.error)
        return
      }

      setSubscribed(true)
      await fetch("/api/push/deliver", { method: "POST" })
    })
  }

  function handleDisablePush() {
    startSubscribe(async () => {
      setSubscribeError(null)

      if (!("serviceWorker" in navigator)) {
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await removePushSubscription(subscription.endpoint)
        await subscription.unsubscribe()
      }

      setSubscribed(false)
    })
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            {subscribed ? <BellRing className="size-4 text-info" /> : <Bell className="size-4" />}
            Push notifications
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get browser alerts for assignments, mentions, and task updates — even when the app is
            closed.
          </p>
        </div>
        {pushConfigured ? (
          subscribed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubscribing}
              onClick={handleDisablePush}
            >
              <BellOff className="size-4" />
              Disable
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isSubscribing}
              onClick={handleEnablePush}
            >
              <Bell className="size-4" />
              Enable
            </Button>
          )
        ) : null}
      </div>

      {!pushConfigured ? (
        <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          Push is not configured. Set <code>NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> and{" "}
          <code>VAPID_PRIVATE_KEY</code> in your environment.
        </p>
      ) : null}

      {subscribeError ? (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {subscribeError}
        </p>
      ) : null}

      {state.error ? (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {state.success}
        </p>
      ) : null}

      <form action={formAction} className="mt-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="push_enabled">Enable push delivery</Label>
          <input
            id="push_enabled"
            name="push_enabled"
            type="checkbox"
            defaultChecked={prefs.push_enabled}
            className="size-4 rounded border-border"
          />
        </div>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Notify me about
          </p>

          {[
            { id: "push_task_assigned", label: "Task assignments", checked: prefs.push_task_assigned },
            { id: "push_mentioned", label: "@Mentions in channels", checked: prefs.push_mentioned },
            { id: "push_task_comment", label: "Comments on my tasks", checked: prefs.push_task_comment },
            { id: "push_task_blocked", label: "Tasks marked blocked", checked: prefs.push_task_blocked },
            {
              id: "push_roadmap_update",
              label: "Roadmap updates",
              checked: prefs.push_roadmap_update,
            },
            {
              id: "push_calendar_reminder",
              label: "Personal calendar reminders",
              checked: prefs.push_calendar_reminder ?? true,
            },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4">
              <Label htmlFor={item.id}>{item.label}</Label>
              <input
                id={item.id}
                name={item.id}
                type="checkbox"
                defaultChecked={item.checked}
                className="size-4 rounded border-border"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </form>
    </div>
  )
}
