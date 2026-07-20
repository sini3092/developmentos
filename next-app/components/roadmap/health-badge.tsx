import type { InitiativeHealth } from "@/lib/database.types"
import {
  INITIATIVE_HEALTH_LABELS,
  INITIATIVE_HEALTH_TONES,
} from "@/lib/constants/roadmap"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type HealthBadgeProps = {
  health: InitiativeHealth
  className?: string
}

const toneClasses = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  default: "border-border bg-muted text-muted-foreground",
} as const

export function HealthBadge({ health, className }: HealthBadgeProps) {
  const tone = INITIATIVE_HEALTH_TONES[health]

  return (
    <Badge
      variant="outline"
      className={cn("font-normal", toneClasses[tone], className)}
    >
      {INITIATIVE_HEALTH_LABELS[health]}
    </Badge>
  )
}
