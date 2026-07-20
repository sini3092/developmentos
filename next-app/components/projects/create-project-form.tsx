"use client"

import { useActionState, useState } from "react"

import { createProject } from "@/lib/actions/projects"
import {
  PROJECT_COLORS,
  PROJECT_VISIBILITY_LABELS,
} from "@/lib/constants/projects"
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
import { Textarea } from "@/components/ui/textarea"

type CreateProjectFormProps = {
  workspaceId: string
}

export function CreateProjectForm({ workspaceId }: CreateProjectFormProps) {
  const [state, formAction, pending] = useActionState(createProject, {})
  const [slug, setSlug] = useState("")

  return (
    <Card className="w-full max-w-2xl border-border/60">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>
          Add a new area of the game to plan, track, and document work.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <CardContent className="space-y-4">
          {state.error ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Player Systems"
              required
              onChange={(event) => {
                if (!slug) {
                  setSlug(slugify(event.target.value))
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Project URL</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              placeholder="player-systems"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="What this project covers and why it exists."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="githubRepoUrl">GitHub repository (optional)</Label>
            <Input
              id="githubRepoUrl"
              name="githubRepoUrl"
              placeholder="https://github.com/owner/repo"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Link the codebase for this project. You can also add or change this later in
              settings.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <select
                id="color"
                name="color"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                defaultValue="blue"
              >
                {PROJECT_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <select
                id="visibility"
                name="visibility"
                className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                defaultValue="workspace"
              >
                {Object.entries(PROJECT_VISIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Creating..." : "Create project"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
