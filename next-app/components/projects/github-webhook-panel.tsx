"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Webhook } from "lucide-react"

import { generateProjectGithubWebhookSecret } from "@/lib/actions/github"
import type { Project } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type GithubWebhookPanelProps = {
  project: Project
  slug: string
  siteUrl: string
  adminConfigured: boolean
}

export function GithubWebhookPanel({
  project,
  slug,
  siteUrl,
  adminConfigured,
}: GithubWebhookPanelProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(generateProjectGithubWebhookSecret, {})
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [isSyncing, startSync] = useTransition()

  const webhookUrl = `${siteUrl}/api/webhooks/github`
  const hasRepo = Boolean(project.github_owner && project.github_repo_name)

  if (!hasRepo) {
    return null
  }

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <Webhook className="mt-0.5 size-5 text-muted-foreground" />
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-sm font-medium">GitHub webhooks</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Receive push and pull request events to log commits in the activity feed and keep
              linked PRs in sync.
            </p>
          </div>

          {!adminConfigured ? (
            <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Add <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> to your
              environment to enable webhook processing.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Payload URL</Label>
            <Input id="webhookUrl" readOnly value={webhookUrl} className="font-mono text-xs" />
          </div>

          {project.github_webhook_secret ? (
            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Webhook secret</Label>
              <Input
                id="webhookSecret"
                readOnly
                value={project.github_webhook_secret}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                In GitHub → Repository → Settings → Webhooks, use content type{" "}
                <strong>application/json</strong>, subscribe to <strong>push</strong> and{" "}
                <strong>pull_request</strong> events, and paste the secret below.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate a secret, then add the webhook in your GitHub repository settings.
            </p>
          )}

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

          {adminConfigured ? (
            <div className="space-y-2 rounded-lg border border-border/50 bg-surface-raised/40 p-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-info" />
                <p className="text-sm font-medium">Souls GAME_STATUS sync</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Run Souls review on the latest GAME_STATUS.md from GitHub and send an Inbox
                notification. Use this if a webhook redelivery did not trigger Souls.
              </p>
              {syncError ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {syncError}
                </p>
              ) : null}
              {syncMessage ? (
                <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                  {syncMessage}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSyncing}
                onClick={() => {
                  setSyncError(null)
                  setSyncMessage(null)
                  startSync(async () => {
                    const response = await fetch(`/api/projects/${slug}/souls/sync-game-status`, {
                      method: "POST",
                    })
                    const data = (await response.json()) as {
                      error?: string
                      reason?: string
                      outcome?: string
                      notificationsSent?: number
                    }
                    if (!response.ok) {
                      setSyncError(data.error ?? data.reason ?? "Souls sync failed.")
                      return
                    }
                    setSyncMessage(
                      `Souls reviewed GAME_STATUS (${data.outcome ?? "done"}). Inbox notifications sent: ${data.notificationsSent ?? 0}.`
                    )
                    router.refresh()
                  })
                }}
              >
                {isSyncing ? "Souls is reviewing…" : "Run Souls GAME_STATUS sync now"}
              </Button>
            </div>
          ) : null}

          <form action={formAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="slug" value={slug} />
            <Button type="submit" variant="outline" disabled={pending || !adminConfigured}>
              {pending
                ? "Generating…"
                : project.github_webhook_secret
                  ? "Rotate webhook secret"
                  : "Generate webhook secret"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
