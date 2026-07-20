"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useTransition } from "react"
import { Code2, GitBranch, RefreshCw, X } from "lucide-react"

import {
  linkTaskBranch,
  linkTaskPullRequest,
  refreshTaskPullRequest,
  unlinkTaskBranch,
  unlinkTaskPullRequest,
} from "@/lib/actions/github"
import type { TaskGithubBranch, TaskGithubPullRequest } from "@/lib/database.types"
import {
  buildGithubBranchUrl,
  formatGithubBranchLabel,
  formatGithubPullRequestLabel,
} from "@/lib/utils/github"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type TaskGithubSectionProps = {
  taskId: string
  slug: string
  pullRequests: TaskGithubPullRequest[]
  branches: TaskGithubBranch[]
  repoOwner?: string | null
  repoName?: string | null
  canEdit: boolean
}

const PR_STATE_TONES: Record<string, "default" | "success" | "warning"> = {
  open: "default",
  closed: "warning",
  merged: "success",
}

export function TaskGithubSection({
  taskId,
  slug,
  pullRequests,
  branches,
  repoOwner,
  repoName,
  canEdit,
}: TaskGithubSectionProps) {
  const router = useRouter()
  const [linkState, linkAction, linkPending] = useActionState(linkTaskPullRequest, {})
  const [branchState, branchAction, branchPending] = useActionState(linkTaskBranch, {})
  const [isUpdating, startUpdate] = useTransition()

  useEffect(() => {
    if (linkState.success || branchState.success) {
      router.refresh()
    }
  }, [linkState.success, branchState.success, router])

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Code2 className="size-4" />
          Linked pull requests
        </h3>

        {pullRequests.length > 0 ? (
          <div className="space-y-2">
            {pullRequests.map((pr) => (
              <div
                key={pr.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface-raised/30 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {formatGithubPullRequestLabel({
                        owner: pr.repo_owner,
                        repo: pr.repo_name,
                        number: pr.pr_number,
                      })}
                    </Badge>
                    <Badge
                      variant={
                        PR_STATE_TONES[pr.pr_state] === "success" ? "default" : "secondary"
                      }
                    >
                      {pr.pr_state}
                    </Badge>
                  </div>
                  <Link
                    href={pr.pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-sm font-medium hover:text-info hover:underline"
                  >
                    {pr.pr_title}
                  </Link>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      disabled={isUpdating}
                      onClick={() => {
                        startUpdate(async () => {
                          await refreshTaskPullRequest(pr.id, slug)
                          router.refresh()
                        })
                      }}
                    >
                      <RefreshCw className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-danger"
                      disabled={isUpdating}
                      onClick={() => {
                        startUpdate(async () => {
                          await unlinkTaskPullRequest(pr.id, slug)
                          router.refresh()
                        })
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pull requests linked yet.</p>
        )}

        {canEdit ? (
          <form action={linkAction} className="space-y-2">
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="slug" value={slug} />
            <div className="flex gap-2">
              <Input
                name="prUrl"
                placeholder="https://github.com/owner/repo/pull/42"
                autoComplete="off"
                required
              />
              <Button type="submit" size="sm" disabled={linkPending}>
                {linkPending ? "Linking..." : "Link PR"}
              </Button>
            </div>
            {linkState.error ? <p className="text-sm text-danger">{linkState.error}</p> : null}
            {linkState.success ? (
              <p className="text-sm text-success">{linkState.success}</p>
            ) : null}
          </form>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-border/50 pt-4">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="size-4" />
          Linked branches
        </h3>

        {branches.length > 0 ? (
          <div className="space-y-2">
            {branches.map((branch) => {
              const owner = repoOwner ?? branch.repo_owner
              const name = repoName ?? branch.repo_name

              return (
                <div
                  key={branch.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface-raised/30 p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {formatGithubBranchLabel(branch.branch_name)}
                    </Badge>
                    <Link
                      href={buildGithubBranchUrl(owner, name, branch.branch_name)}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-sm font-medium hover:text-info hover:underline"
                    >
                      {owner}/{name}
                    </Link>
                  </div>
                  {canEdit ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-foreground hover:text-danger"
                      disabled={isUpdating}
                      onClick={() => {
                        startUpdate(async () => {
                          await unlinkTaskBranch(branch.id, slug)
                          router.refresh()
                        })
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No branches linked yet.</p>
        )}

        {canEdit ? (
          <form action={branchAction} className="space-y-2">
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="slug" value={slug} />
            <div className="flex gap-2">
              <Input
                name="branchName"
                placeholder={repoOwner && repoName ? "feature/player-movement" : "main"}
                autoComplete="off"
                required
              />
              <Button type="submit" size="sm" disabled={branchPending}>
                {branchPending ? "Linking..." : "Link branch"}
              </Button>
            </div>
            {branchState.error ? <p className="text-sm text-danger">{branchState.error}</p> : null}
            {branchState.success ? (
              <p className="text-sm text-success">{branchState.success}</p>
            ) : null}
          </form>
        ) : null}
      </section>
    </div>
  )
}
