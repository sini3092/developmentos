"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useMemo } from "react"

import type { CalendarEvent, CalendarProjectOption } from "@/lib/auth/calendar-context"
import { PROJECT_COLOR_CLASSES, type ProjectColor } from "@/lib/constants/projects"
import {
  buildMonthGrid,
  formatMonthLabel,
  getMonthParam,
  shiftMonth,
} from "@/lib/utils/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CalendarViewProps = {
  year: number
  month: number
  events: CalendarEvent[]
  projects: CalendarProjectOption[]
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const toneClasses: Record<CalendarEvent["tone"], string> = {
  default: "border-border/60 bg-surface-raised/70",
  info: "border-info/30 bg-info/10",
  success: "border-success/30 bg-success/10",
  warning: "border-warning/30 bg-warning/10",
  danger: "border-danger/30 bg-danger/10",
}

export function CalendarView({ year, month, events, projects }: CalendarViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectFilter = searchParams.get("project") || "all"

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month])
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const list = map.get(event.date) ?? []
      list.push(event)
      map.set(event.date, list)
    }
    return map
  }, [events])

  function navigate(nextYear: number, nextMonth: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", getMonthParam(nextYear, nextMonth))
    router.push(`/calendar?${params.toString()}`)
  }

  function updateProjectFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === "all") {
      params.delete("project")
    } else {
      params.set("project", value)
    }
    router.push(`/calendar?${params.toString()}`)
  }

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" size="icon" variant="outline" onClick={() => navigate(prev.year, prev.month)}>
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="min-w-40 text-center text-lg font-semibold">
            {formatMonthLabel(year, month)}
          </h2>
          <Button type="button" size="icon" variant="outline" onClick={() => navigate(next.year, next.month)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const now = new Date()
              navigate(now.getFullYear(), now.getMonth() + 1)
            }}
          >
            Today
          </Button>
        </div>

        <select
          value={projectFilter}
          onChange={(event) => updateProjectFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.slug}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="grid grid-cols-7 border-b border-border/60 bg-surface-raised/40">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="divide-y divide-border/40">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 divide-x divide-border/40">
                {week.map((cell) => {
                  const dayEvents = eventsByDate.get(cell.key) ?? []
                  return (
                    <div
                      key={cell.key}
                      className={cn(
                        "min-h-28 p-2",
                        !cell.inMonth && "bg-muted/20 text-muted-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-medium",
                          cell.isToday && "bg-primary text-primary-foreground"
                        )}
                      >
                        {cell.day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <CalendarEventChip key={`${event.type}-${event.id}`} event={event} />
                        ))}
                        {dayEvents.length > 3 ? (
                          <p className="px-1 text-[10px] text-muted-foreground">
                            +{dayEvents.length - 3} more
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="text-sm font-medium">This month</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {events.length} scheduled item{events.length === 1 ? "" : "s"}
            </p>
            <div className="mt-4 space-y-2">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No due dates this month.</p>
              ) : (
                events.slice(0, 12).map((event) => (
                  <Link
                    key={`${event.type}-${event.id}`}
                    href={event.href}
                    className={cn(
                      "block rounded-lg border px-3 py-2 text-sm transition-colors hover:border-info/40",
                      toneClasses[event.tone]
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          PROJECT_COLOR_CLASSES[event.projectColor as ProjectColor] ??
                            PROJECT_COLOR_CLASSES.slate
                        )}
                      />
                      <span className="truncate font-medium">{event.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {event.subtitle}
                      {" · "}
                      {event.projectName}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4 text-sm">
            <h3 className="font-medium">Legend</h3>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-500" />
                Task due date
              </li>
              <li className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple-500" />
                Milestone target date
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function CalendarEventChip({ event }: { event: CalendarEvent }) {
  return (
    <Link
      href={event.href}
      className={cn(
        "block truncate rounded border px-1.5 py-0.5 text-[10px] leading-tight transition-colors hover:opacity-90",
        toneClasses[event.tone],
        event.type === "milestone" && "font-medium"
      )}
      title={`${event.title} · ${event.projectName}`}
    >
      <span
        className={cn(
          "mr-1 inline-block size-1.5 rounded-full align-middle",
          PROJECT_COLOR_CLASSES[event.projectColor as ProjectColor] ??
            PROJECT_COLOR_CLASSES.slate
        )}
      />
      {event.type === "task" ? event.subtitle : "◆"} {event.title}
    </Link>
  )
}
