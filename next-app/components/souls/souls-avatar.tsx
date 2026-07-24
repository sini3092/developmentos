import { Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"

const sizeClasses = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
} as const

const sparkleClasses = {
  sm: "size-2.5 -right-0.5 -bottom-0.5",
  md: "size-3 -right-0.5 -bottom-0.5",
  lg: "size-3.5 -right-1 -bottom-1",
} as const

type SoulsAvatarProps = {
  size?: keyof typeof sizeClasses
  className?: string
}

export function SoulsAvatar({ size = "md", className }: SoulsAvatarProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-serif font-semibold text-white shadow-md ring-2 ring-violet-500/20",
        "bg-gradient-to-br from-violet-600 via-primary to-teal-500",
        sizeClasses[size],
        className
      )}
      aria-hidden
    >
      <span className="relative z-10 drop-shadow-sm">S</span>
      <Sparkles className={cn("absolute text-amber-200", sparkleClasses[size])} />
    </div>
  )
}

export const SOULS_DISPLAY_NAME = "Souls"
export const SOULS_TAGLINE = "Keeper of Everwood"
