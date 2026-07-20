"use client"

import { useActionState, useState } from "react"

import { createWorkspace } from "@/lib/actions/workspace"
import { slugify } from "@/lib/utils/format"
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

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createWorkspace, {})
  const [slug, setSlug] = useState("")

  return (
    <Card className="w-full max-w-lg border-border/60 bg-card/95 shadow-lg">
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          This is where your team will plan, build, and track the game together.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {state.error ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="name">Workspace name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Medieval Fantasy"
              required
              onChange={(event) => {
                if (!slug) {
                  setSlug(slugify(event.target.value))
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Workspace URL</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">developmentos.app/</span>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(event) => setSlug(slugify(event.target.value))}
                placeholder="medieval-fantasy"
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating workspace..." : "Create workspace"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
