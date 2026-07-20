"use client"

import Link from "next/link"
import { useActionState, useTransition } from "react"
import { Code2 } from "lucide-react"

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
}

export function GithubIntegrationPanel({
  configured,
  connected,
  username,
  statusMessage,
}: GithubIntegrationPanelProps) {
  const [state, formAction, pending] = useActionState(disconnectGithub, {})
  const [isConnecting, startConnect] = useTransition()

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code2 className="size-4" />
          GitHub
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to enrich linked pull requests with titles and status.
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
          <p className="text-sm text-muted-foreground">
            Add <code className="font-mono text-xs">GITHUB_CLIENT_ID</code> and{" "}
            <code className="font-mono text-xs">GITHUB_CLIENT_SECRET</code> to enable OAuth.
          </p>
        ) : connected ? (
          <p className="text-sm">
            Connected as <strong>@{username}</strong>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not connected. You can still paste pull request URLs on tasks manually.
          </p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
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
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
