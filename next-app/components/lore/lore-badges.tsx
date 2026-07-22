import type { CanonStatus, LoreEntryType } from "@/lib/database.types"
import { CANON_STATUS_LABELS, LORE_ENTRY_TYPE_LABELS } from "@/lib/constants/knowledge"
import { LORE_TYPE_TONE } from "@/lib/constants/lore-navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const toneClasses = {
  blue: "border-info/30 bg-info/10 text-info",
  red: "border-danger/30 bg-danger/10 text-danger",
  green: "border-success/30 bg-success/10 text-success",
  amber: "border-warning/30 bg-warning/10 text-warning",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
  cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300",
} as const

const canonToneClasses: Record<CanonStatus, string> = {
  concept: "border-muted-foreground/20 bg-muted text-muted-foreground",
  draft: "border-warning/30 bg-warning/10 text-warning",
  review: "border-info/30 bg-info/10 text-info",
  canon: "border-success/30 bg-success/10 text-success",
  retconned: "border-danger/30 bg-danger/10 text-danger",
  archived: "border-border bg-muted text-muted-foreground",
}

export function LoreTypeBadge({ type }: { type: LoreEntryType }) {
  const tone = LORE_TYPE_TONE[type] ?? "blue"
  return (
    <Badge variant="outline" className={cn("font-normal", toneClasses[tone])}>
      {LORE_ENTRY_TYPE_LABELS[type]}
    </Badge>
  )
}

export function LoreCanonBadge({ status }: { status: CanonStatus }) {
  return (
    <Badge variant="outline" className={cn("font-normal", canonToneClasses[status])}>
      {CANON_STATUS_LABELS[status]}
    </Badge>
  )
}
