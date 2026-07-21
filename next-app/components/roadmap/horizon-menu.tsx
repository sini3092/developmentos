"use client"

import { useTransition } from "react"
import { ChevronDown } from "lucide-react"

import { updateInitiativeHorizon } from "@/lib/actions/roadmap"
import type { PlanningHorizon } from "@/lib/database.types"
import {
  PLANNING_HORIZONS,
  PLANNING_HORIZON_LABELS,
} from "@/lib/constants/roadmap"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type HorizonMenuProps = {
  initiativeId: string
  slug: string
  initiativeSlug: string
  currentHorizon: PlanningHorizon
  canEdit: boolean
}

export function HorizonMenu({
  initiativeId,
  slug,
  initiativeSlug,
  currentHorizon,
  canEdit,
}: HorizonMenuProps) {
  const [pending, startTransition] = useTransition()

  if (!canEdit) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        {PLANNING_HORIZON_LABELS[currentHorizon]}
      </span>
    )
  }

  function moveTo(horizon: PlanningHorizon) {
    if (horizon === currentHorizon) return
    startTransition(async () => {
      await updateInitiativeHorizon(initiativeId, slug, initiativeSlug, horizon)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          disabled={pending}
          onClick={(event) => event.preventDefault()}
        >
          Move
          <ChevronDown className="size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        {PLANNING_HORIZONS.map((horizon) => (
          <DropdownMenuItem
            key={horizon}
            disabled={horizon === currentHorizon || pending}
            onClick={() => moveTo(horizon)}
          >
            {PLANNING_HORIZON_LABELS[horizon]}
            {horizon === currentHorizon ? " (current)" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
