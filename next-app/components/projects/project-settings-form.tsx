"use client"

import { useActionState } from "react"

import { updateProject } from "@/lib/actions/projects"
import type { Project } from "@/lib/database.types"
import {
  PROJECT_COLORS,
  PROJECT_VISIBILITY_LABELS,
} from "@/lib/constants/projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ProjectSettingsFormProps = {
  project: Project
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const [state, formAction, pending] = useActionState(updateProject, {})

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <div>
        <h3 className="text-sm font-medium">Project details</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the project name, description, visibility, and optional GitHub link.
        </p>
      </div>
      <input type="hidden" name="projectId" value={project.id} />
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
      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" defaultValue={project.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={project.description ?? ""}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="githubRepoUrl">GitHub repository (optional)</Label>
        <Input
          id="githubRepoUrl"
          name="githubRepoUrl"
          defaultValue={project.github_repo_url ?? ""}
          placeholder="https://github.com/owner/repo"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Leave blank to remove the linked repository.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <select
            id="color"
            name="color"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue={project.color}
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
            defaultValue={project.visibility}
          >
            {Object.entries(PROJECT_VISIBILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  )
}
