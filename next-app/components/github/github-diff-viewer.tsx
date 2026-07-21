"use client"

import type { GithubDiffFile } from "@/lib/github/diff"
import { cn } from "@/lib/utils"

type GithubDiffViewerProps = {
  files: GithubDiffFile[]
  className?: string
}

export function GithubDiffViewer({ files, className }: GithubDiffViewerProps) {
  if (files.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        No file changes in this selection.
      </p>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {files.map((file) => (
        <article
          key={file.filename}
          className="overflow-hidden rounded-lg border border-border/60 bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
            <p className="font-mono text-xs font-medium break-all">{file.filename}</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+{file.additions}</span>{" "}
              <span className="text-danger">-{file.deletions}</span> · {file.status}
            </p>
          </div>
          {file.patch ? (
            <pre className="max-h-80 overflow-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
              {file.patch.split("\n").map((line, index) => (
                <span
                  key={`${file.filename}-${index}`}
                  className={cn(
                    "block",
                    line.startsWith("+") && !line.startsWith("+++")
                      ? "bg-success/10 text-success"
                      : line.startsWith("-") && !line.startsWith("---")
                        ? "bg-danger/10 text-danger"
                        : line.startsWith("@@")
                          ? "text-info"
                          : "text-foreground/90"
                  )}
                >
                  {line || " "}
                </span>
              ))}
            </pre>
          ) : (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Diff too large to display inline on GitHub.
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
