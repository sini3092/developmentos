"use client"

import Link from "next/link"
import { useActionState, useTransition } from "react"
import { Code2, ExternalLink } from "lucide-react"

import { disconnectGithub } from "@/lib/actions/integrations"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type GithubIntegrationPanelProps = {
  configured: boolean
  connected: boolean
  username?: string | null
  statusMessage?: string | null
  siteUrl: string
}

export function GithubIntegrationPanel({
  configured,
  connected,
  username,
  statusMessage,
  siteUrl,
}: GithubIntegrationPanelProps) {
  const [state, formAction, pending] = useActionState(disconnectGithub, {})
  const [isConnecting, startConnect] = useTransition()
  const callbackUrl = `${siteUrl}/api/integrations/github/callback`

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 className="size-4" />
          GitHub
        </CardTitle>
        <CardDescription>
          Connect your GitHub account for PR status on tasks. Link a repo per project for
          webhooks and commit history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {statusMessage ? (
          <p className="rounded-lg border border-border/60 bg-surface-raised/50 px-3 py-2 text-sm">
            {statusMessage}
          </p>
        ) : null}
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
        {!configured ? (
          <div className="space-y-3 rounded-lg border border-dashed border-border/80 bg-surface-raised/40 p-4 text-sm">
            <p className="font-medium">Setup (one-time)</p>
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>
                Create a{" "}
                <Link
                  href="https://github.com/settings/applications/new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline"
                >
                  GitHub OAuth App
                </Link>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  <li>
                    Homepage URL:{" "}
                    <code className="rounded bg-muted px-1 text-xs">{siteUrl}</code>
                  </li>
                  <li>
                    Callback URL:{" "}
                    <code className="rounded bg-muted px-1 text-xs break-all">{callbackUrl}</code>
                  </li>
                  <li>
                    For local dev, add a second callback:{" "}
                    <code className="rounded bg-muted px-1 text-xs">
                      http://localhost:3000/api/integrations/github/callback
                    </code>
                  </li>
                </ul>
              </li>
              <li>
                Set <code className="font-mono text-xs">GITHUB_CLIENT_ID</code> and{" "}
                <code className="font-mono text-xs">GITHUB_CLIENT_SECRET</code> in Vercel env
                vars (and <code className="font-mono text-xs">.env.local</code> for local).
              </li>
              <li>Redeploy, then click Connect GitHub below.</li>
            </ol>
          </div>
        ) : connected ? (
          <p className="text-sm">
            Connected as <strong>@{username}</strong>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            OAuth is configured. Connect your GitHub account to refresh linked PR titles and status.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {configured && !connected ? (
          <Button
            type="button"
            disabled={isConnecting}
            onClick={() => {
              startConnect(() => {
                window.location.href = "/api/integrations/github/connect"
              })
            }}
          >
            {isConnecting ? "Redirecting..." : "Connect GitHub"}
          </Button>
        ) : null}
        {connected ? (
          <form action={formAction}>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </form>
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <Link href="https://github.com/settings/developers" target="_blank" rel="noreferrer">
            GitHub OAuth apps
            <ExternalLink className="ml-1 size-3" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
