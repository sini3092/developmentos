import type { MyWorkGroup } from "@/lib/auth/dashboard-context"
import { TaskListPanel } from "@/components/dashboard/task-list-panel"

type MyWorkViewProps = {
  groups: MyWorkGroup[]
}

export function MyWorkView({ groups }: MyWorkViewProps) {
  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-10 text-center text-sm text-muted-foreground">
        No open tasks assigned to you. Check back after your team assigns work.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.label} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{group.label}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {group.tasks.length}
            </span>
          </div>
          <TaskListPanel tasks={group.tasks} />
        </section>
      ))}
    </div>
  )
}
