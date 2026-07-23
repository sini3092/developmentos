import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Clock,
  Globe2,
  Home,
  MapPin,
  Package,
  Scroll,
  Shield,
  Sparkles,
  Swords,
  User,
  Users,
} from "lucide-react"

import type { LoreEntryType } from "@/lib/database.types"
import { LORE_ENTRY_TYPE_LABELS } from "@/lib/constants/knowledge"
import { LORE_TYPE_TONE } from "@/lib/constants/lore-navigation"
import { cn } from "@/lib/utils"

const toneCoverClasses = {
  blue: "from-blue-500/25 via-blue-500/10 to-muted/30 text-blue-700/80 dark:text-blue-300/90",
  red: "from-red-500/25 via-red-500/10 to-muted/30 text-red-700/80 dark:text-red-300/90",
  green: "from-emerald-500/25 via-emerald-500/10 to-muted/30 text-emerald-700/80 dark:text-emerald-300/90",
  amber: "from-amber-500/25 via-amber-500/10 to-muted/30 text-amber-800/80 dark:text-amber-300/90",
  orange: "from-orange-500/25 via-orange-500/10 to-muted/30 text-orange-700/80 dark:text-orange-300/90",
  purple: "from-purple-500/25 via-purple-500/10 to-muted/30 text-purple-700/80 dark:text-purple-300/90",
  cyan: "from-cyan-500/25 via-cyan-500/10 to-muted/30 text-cyan-700/80 dark:text-cyan-300/90",
  pink: "from-pink-500/25 via-pink-500/10 to-muted/30 text-pink-700/80 dark:text-pink-300/90",
} as const

const LORE_ENTRY_ICONS: Partial<Record<LoreEntryType, LucideIcon>> = {
  character: User,
  faction: Shield,
  location: MapPin,
  region: Globe2,
  settlement: Home,
  creature: Swords,
  enemy: Swords,
  deity: Sparkles,
  historical_event: Clock,
  timeline_event: Clock,
  culture: Users,
  religion: Sparkles,
  item: Package,
  weapon: Swords,
  artifact: Sparkles,
  resource: Package,
  quest: BookOpen,
  story_arc: BookOpen,
  dialogue: Scroll,
  book_or_note: Scroll,
  magic_system: Sparkles,
  language: Scroll,
  other: Scroll,
}

function coverAccent(name: string) {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash)
  }
  const variants = [
    "bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_55%)]",
    "bg-[radial-gradient(circle_at_80%_25%,rgba(255,255,255,0.28),transparent_50%)]",
    "bg-[radial-gradient(circle_at_50%_85%,rgba(255,255,255,0.22),transparent_55%)]",
  ]
  return variants[Math.abs(hash) % variants.length]
}

export function LoreEntryCover({
  name,
  entryType,
  compact = false,
  className,
}: {
  name: string
  entryType: LoreEntryType
  compact?: boolean
  className?: string
}) {
  const tone = LORE_TYPE_TONE[entryType] ?? "blue"
  const Icon = LORE_ENTRY_ICONS[entryType] ?? Scroll
  const typeLabel = LORE_ENTRY_TYPE_LABELS[entryType]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-gradient-to-br",
        compact ? "size-12 shrink-0" : "aspect-[16/9] w-full",
        toneCoverClasses[tone],
        className
      )}
      aria-hidden
    >
      <div className={cn("absolute inset-0", coverAccent(name))} />
      <div
        className={cn(
          "absolute inset-0 opacity-[0.07]",
          "bg-[linear-gradient(135deg,transparent_0%,currentColor_50%,transparent_100%)]"
        )}
      />
      <div
        className={cn(
          "relative flex h-full flex-col items-center justify-center gap-1",
          compact ? "p-2" : "p-4"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full border border-current/15 bg-background/35 backdrop-blur-sm",
            compact ? "size-7" : "size-12"
          )}
        >
          <Icon className={cn(compact ? "size-3.5" : "size-5")} strokeWidth={1.75} />
        </div>
        {!compact ? (
          <p className="text-[10px] font-medium tracking-wide uppercase opacity-80">{typeLabel}</p>
        ) : null}
      </div>
    </div>
  )
}
