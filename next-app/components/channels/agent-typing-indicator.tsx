import { cn } from "@/lib/utils"
import type { AgentName } from "@/lib/utils/mentions"

type AgentTypingIndicatorProps = {
  agent: AgentName
  className?: string
}

const LABELS: Record<AgentName, string> = {
  souls: "Souls is thinking",
  personal: "Personal is working",
}

export function AgentTypingIndicator({ agent, className }: AgentTypingIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/60 bg-surface-raised/40 px-3 py-2 text-sm text-muted-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-[10px] font-semibold",
          agent === "souls" ? "bg-primary/15 text-primary" : "bg-info/15 text-info"
        )}
      >
        {agent === "souls" ? "AI" : "CX"}
      </span>
      <span>{LABELS[agent]}</span>
      <span className="inline-flex gap-1">
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
      </span>
    </div>
  )
}
