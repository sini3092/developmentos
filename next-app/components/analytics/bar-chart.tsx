import type { CountItem } from "@/lib/auth/analytics-context"
import { cn } from "@/lib/utils"

type BarChartProps = {
  title: string
  items: CountItem[]
  emptyMessage?: string
}

const toneClasses = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
} as const

export function BarChart({
  title,
  items,
  emptyMessage = "No data yet.",
}: BarChartProps) {
  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="text-sm font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="tabular-nums font-medium">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    toneClasses[item.tone ?? "default"]
                  )}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
