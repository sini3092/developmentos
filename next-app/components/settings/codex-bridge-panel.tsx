"use client"

import { useActionState, useState } from "react"
import { Bot } from "lucide-react"

import { createCodexBridgeToken } from "@/lib/actions/integrations"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function CodexBridgePanel() {
  const [state, formAction, pending] = useActionState(createCodexBridgeToken, {})
  const [copied, setCopied] = useState(false)

  async function copyToken(token: string) {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4" />
          Codex Bridge (@personal)
        </CardTitle>
        <CardDescription>
          Mention <code className="rounded bg-muted px-1">@personal</code> in chat to queue work for
          Codex on your PC. Generate a bridge token and run the local client.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
        {state.token ? (
          <div className="space-y-2">
            <Input readOnly value={state.token} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="sm" onClick={() => void copyToken(state.token!)}>
              {copied ? "Copied" : "Copy token"}
            </Button>
          </div>
        ) : null}
        <form action={formAction}>
          <Button type="submit" disabled={pending}>
            {pending ? "Generating..." : "Generate bridge token"}
          </Button>
        </form>
        <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          {`npm run codex-bridge -- --token YOUR_TOKEN --url ${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}`}
        </pre>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Run the bridge on your PC. Personal replies in chat when Codex picks up and completes jobs.
      </CardFooter>
    </Card>
  )
}
