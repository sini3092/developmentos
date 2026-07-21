"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, GitBranch, GitCommitHorizontal } from "lucide-react"

import { GithubDiffViewer } from "@/components/github/github-diff-viewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { GithubDiffResponse } from "@/lib/github/diff"
import {
  formatActivityEventMessage,
  formatActivityEventType,
  formatCommitSha,
  getActivityEventUrl,
  getGithubCommits,
  getGithubRepoFromValue,
  parseGithubActivityValue,
  type GithubActivityValue,
} from "@/lib/utils/activity"
import { cn } from "@/lib/utils"

type GithubEventDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  eventType: string
  message: string | null
  newValue: unknown
  createdAt: string
  actorDisplayName?: string | null
}

function getDialogTitle(eventType: string, value: GithubActivityValue | null) {
  if (eventType === "github.pull_request") {
    return value?.pr_title ? `PR #${value.pr_number}: ${value.pr_title}` : "Pull request"
  }

  if (value?.branch_name) {
    return `Push to ${value.branch_name}`
  }

  return formatActivityEventType(eventType)
}

export function GithubEventDetailDialog({
  open,
  onOpenChange,
  slug,
  eventType,
  message,
  newValue,
  createdAt,
  actorDisplayName,
}: GithubEventDetailDialogProps) {
  const value = parseGithubActivityValue(newValue)
  const commits = useMemo(() => getGithubCommits(value), [value])
  const externalUrl = getActivityEventUrl(eventType, newValue)
  const summary = formatActivityEventMessage(eventType, message, newValue)

  const [tab, setTab] = useState<"commits" | "diff">("commits")
  const [selectedSha, setSelectedSha] = useState<string | null>(null)
  const [diff, setDiff] = useState<GithubDiffResponse | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)
  const [loadingDiff, setLoadingDiff] = useState(false)

  const ownerRepo = getGithubRepoFromValue(value)
  const owner = ownerRepo.owner
  const repo = ownerRepo.repo

  useEffect(() => {
    if (!open) {
      return
    }

    const defaultSha = commits[0]?.id ?? value?.latest_commit?.id ?? null
    setTab("commits")
    setSelectedSha(defaultSha)
    setDiff(null)
    setDiffError(null)
  }, [open, commits, value?.latest_commit?.id])

  useEffect(() => {
    if (!open || tab !== "diff") {
      return
    }

    async function loadDiff() {
      setLoadingDiff(true)
      setDiffError(null)

      try {
        const params = new URLSearchParams()
        if (owner) params.set("owner", owner)
        if (repo) params.set("repo", repo)

        if (selectedSha) {
          params.set("sha", selectedSha)
        } else if (value?.before_sha && value?.after_sha) {
          params.set("before", value.before_sha)
          params.set("after", value.after_sha)
        } else {
          setDiffError("No commit range stored for this push. New pushes will include diff data.")
          setDiff(null)
          setLoadingDiff(false)
          return
        }

        const response = await fetch(`/api/projects/${slug}/github/diff?${params.toString()}`)
        const data = (await response.json()) as GithubDiffResponse & { error?: string }

        if (!response.ok) {
          setDiffError(data.error ?? "Could not load diff.")
          setDiff(null)
          return
        }

        setDiff(data)
      } catch {
        setDiffError("Could not load diff.")
        setDiff(null)
      } finally {
        setLoadingDiff(false)
      }
    }

    void loadDiff()
  }, [open, tab, selectedSha, slug, owner, repo, value?.before_sha, value?.after_sha])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="gap-3 border-b border-border/60 px-4 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {formatActivityEventType(eventType)}
            </Badge>
            {value?.branch_name ? (
              <Badge variant="secondary" className="gap-1 font-normal">
                <GitBranch className="size-3" />
                {value.branch_name}
              </Badge>
            ) : null}
            {value?.pr_state ? (
              <Badge variant="secondary" className="font-normal capitalize">
                {value.pr_state}
              </Badge>
            ) : null}
          </div>
          <DialogTitle>{getDialogTitle(eventType, value)}</DialogTitle>
          <DialogDescription className="text-sm text-foreground/90">{summary}</DialogDescription>
          <p className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleString()}
            {actorDisplayName ? ` · ${actorDisplayName}` : ""}
            {value?.pusher ? ` · pushed by ${value.pusher}` : ""}
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant={tab === "commits" ? "default" : "outline"}
              onClick={() => setTab("commits")}
            >
              Commits ({commits.length || value?.commit_count || 0})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "diff" ? "default" : "outline"}
              onClick={() => setTab("diff")}
            >
              Diff
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {tab === "commits" ? (
            commits.length > 0 ? (
              <ul className="space-y-2">
                {commits.map((commit) => {
                  const firstLine = (commit.message ?? "Commit").split("\n")[0]
                  const isSelected = selectedSha === commit.id
                  return (
                    <li key={commit.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSha(commit.id)
                          setTab("diff")
                        }}
                        className={cn(
                          "w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-colors hover:border-info/40 hover:bg-info/5",
                          isSelected && "border-info/50 ring-1 ring-info/30"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm leading-snug font-medium break-words">{firstLine}</p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-mono">{formatCommitSha(commit.id)}</span>
                              {commit.author ? ` · ${commit.author}` : ""}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No commit details stored for this event.
              </p>
            )
          ) : (
            <div className="space-y-3">
              {commits.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {commits.map((commit) => (
                    <Button
                      key={commit.id}
                      type="button"
                      size="sm"
                      variant={selectedSha === commit.id ? "default" : "outline"}
                      onClick={() => setSelectedSha(commit.id)}
                      className="font-mono text-xs"
                    >
                      {formatCommitSha(commit.id)}
                    </Button>
                  ))}
                  {value?.before_sha && value?.after_sha ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={!selectedSha ? "default" : "outline"}
                      onClick={() => setSelectedSha(null)}
                    >
                      All changes
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {loadingDiff ? (
                <p className="text-sm text-muted-foreground">Loading diff from GitHub…</p>
              ) : diffError ? (
                <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                  {diffError}
                </p>
              ) : (
                <GithubDiffViewer files={diff?.files ?? []} />
              )}
            </div>
          )}
        </div>

        {externalUrl ? (
          <DialogFooter className="border-t border-border/60 bg-muted/30">
            <Button variant="outline" asChild>
              <a href={externalUrl} target="_blank" rel="noreferrer">
                View on GitHub
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
