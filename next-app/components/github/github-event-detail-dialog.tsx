"use client"

import { ExternalLink, GitBranch, GitCommitHorizontal } from "lucide-react"

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
import {
  formatActivityEventMessage,
  formatActivityEventType,
  formatCommitSha,
  getActivityEventUrl,
  getGithubCommits,
  parseGithubActivityValue,
  type GithubActivityValue,
} from "@/lib/utils/activity"

type GithubEventDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  eventType,
  message,
  newValue,
  createdAt,
  actorDisplayName,
}: GithubEventDetailDialogProps) {
  const value = parseGithubActivityValue(newValue)
  const commits = getGithubCommits(value)
  const externalUrl = getActivityEventUrl(eventType, newValue)
  const summary = formatActivityEventMessage(eventType, message, newValue)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,640px)] gap-0 overflow-hidden p-0 sm:max-w-lg">
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
        </DialogHeader>

        {eventType === "github.pull_request" && value ? (
          <div className="space-y-2 px-4 py-4 text-sm">
            {value.action ? (
              <p>
                <span className="text-muted-foreground">Action:</span>{" "}
                <span className="font-medium capitalize">{value.action}</span>
              </p>
            ) : null}
            {value.pr_number ? (
              <p>
                <span className="text-muted-foreground">Number:</span>{" "}
                <span className="font-medium">#{value.pr_number}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {commits.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {commits.length === 1 ? "Commit" : `${commits.length} commits`}
              {value?.commit_count && value.commit_count > commits.length
                ? ` (showing latest ${commits.length})`
                : ""}
            </p>
            <ul className="space-y-2">
              {commits.map((commit) => {
                const firstLine = commit.message.split("\n")[0]
                return (
                  <li
                    key={commit.id}
                    className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm leading-snug font-medium break-words">{firstLine}</p>
                        {commit.message.includes("\n") ? (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                            {commit.message.split("\n").slice(1).join("\n").trim()}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{formatCommitSha(commit.id)}</span>
                          {commit.author ? ` · ${commit.author}` : ""}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No commit details were stored for this event.
          </div>
        )}

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
