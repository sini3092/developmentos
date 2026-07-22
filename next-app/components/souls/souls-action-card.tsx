"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2, ExternalLink, XCircle } from "lucide-react"

import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { cn } from "@/lib/utils"

export function SoulsActionCard({ action }: { action: SoulsActionResult }) {
  const isSuccess = action.status === "success"

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        isSuccess ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
      )}
    >
      <div className="flex items-start gap-2">
        {isSuccess ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
        ) : (
          <XCircle className="mt-0.5 size-4 shrink-0 text-danger" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{action.label}</p>
          {action.summary ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{action.summary}</p>
          ) : null}
          {action.error ? <p className="mt-1 text-xs text-danger">{action.error}</p> : null}
          {action.before || action.after ? (
            <div className="mt-2 space-y-1 rounded-md bg-background/70 p-2 font-mono text-[11px] text-muted-foreground">
              {action.before ? (
                <p>
                  <span className="text-danger">−</span>{" "}
                  {summarizeRecord(action.before)}
                </p>
              ) : null}
              {action.after ? (
                <p>
                  <span className="text-success">+</span>{" "}
                  {summarizeRecord(action.after)}
                </p>
              ) : null}
            </div>
          ) : null}
          {action.href ? (
            <Link
              href={action.href}
              className="mt-2 inline-flex items-center gap-1 text-xs text-info hover:underline"
            >
              Open result
              <ExternalLink className="size-3" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function summarizeRecord(record: Record<string, unknown>) {
  if ("name" in record && record.name) {
    return String(record.name)
  }
  if ("title" in record && record.title) {
    return String(record.title)
  }
  if ("identifier" in record && record.identifier) {
    return String(record.identifier)
  }
  return JSON.stringify(record).slice(0, 120)
}

export function SoulsWorkingSteps({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      <span>{label ?? "Souls is working…"}</span>
      <ArrowRight className="ml-auto size-3.5 animate-pulse" />
    </div>
  )
}
