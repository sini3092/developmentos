"use client"

import { useActionState } from "react"
import { Sparkles } from "lucide-react"

import { updateOpenRouterSettings } from "@/lib/actions/integrations"
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
import { Label } from "@/components/ui/label"

type SoulsAiPanelProps = {
  workspaceId: string
  configured: boolean
  model: string
}

export function SoulsAiPanel({ workspaceId, configured, model }: SoulsAiPanelProps) {
  const [state, formAction, pending] = useActionState(updateOpenRouterSettings, {})

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4" />
          Souls AI (@souls)
        </CardTitle>
        <CardDescription>
          Connect OpenRouter to chat with Souls in project chat. Mention{" "}
          <code className="rounded bg-muted px-1">@souls</code> with your question.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="openrouter-key">OpenRouter API key</Label>
            <Input
              id="openrouter-key"
              name="apiKey"
              type="password"
              placeholder={configured ? "••••••••••••••••" : "sk-or-..."}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openrouter-model">Model</Label>
            <Input
              id="openrouter-model"
              name="model"
              defaultValue={model}
              placeholder="google/gemini-2.0-flash-001"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : configured ? "Update Souls AI" : "Connect Souls AI"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Get a key at openrouter.ai. Souls reads tasks, roadmap, and checklists for context.
      </CardFooter>
    </Card>
  )
}
