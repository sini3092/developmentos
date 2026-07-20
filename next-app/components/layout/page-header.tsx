import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: string
  description?: string
  icon?: LucideIcon
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="size-5 text-muted-foreground" /> : null}
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        </div>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  )
}

type PlaceholderPanelProps = {
  title: string
  description: string
  className?: string
}

export function PlaceholderPanel({
  title,
  description,
  className,
}: PlaceholderPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-8 text-center",
        className
      )}
    >
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

type StatCardProps = {
  label: string
  value: string
  hint?: string
  tone?: "default" | "success" | "warning" | "danger" | "info" | "lore"
}

const toneClasses = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  lore: "text-lore",
} as const

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClasses[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
