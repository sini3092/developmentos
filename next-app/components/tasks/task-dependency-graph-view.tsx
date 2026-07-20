"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowLeft, Network } from "lucide-react"

import type { TaskDependencyGraph, TaskStatus } from "@/lib/database.types"
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants/tasks"
import { TaskStatusBadge } from "@/components/tasks/task-badges"
import { Button } from "@/components/ui/button"

const NODE_RADIUS = 30
const WIDTH = 900
const HEIGHT = 600

const STATUS_COLORS: Partial<Record<TaskStatus, string>> = {
  backlog: "var(--muted-foreground)",
  ready: "var(--chart-3)",
  in_progress: "var(--chart-1)",
  in_review: "var(--chart-4)",
  blocked: "var(--chart-4)",
  done: "var(--chart-2)",
  cancelled: "var(--muted-foreground)",
}

function colorForStatus(status: TaskStatus) {
  return STATUS_COLORS[status] ?? "var(--muted-foreground)"
}

type PositionedNode = TaskDependencyGraph["nodes"][number] & { x: number; y: number }

function layoutCircle(
  items: TaskDependencyGraph["nodes"],
  width: number,
  height: number,
  radiusScale = 0.38
) {
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * radiusScale

  return new Map<string, PositionedNode>(
    items.map((item, index) => {
      const angle = (2 * Math.PI * index) / Math.max(items.length, 1) - Math.PI / 2
      return [
        item.id,
        {
          ...item,
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        },
      ]
    })
  )
}

function edgePoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  nodeRadius = NODE_RADIUS
) {
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const distance = Math.sqrt(dx * dx + dy * dy) || 1
  const unitX = dx / distance
  const unitY = dy / distance

  return {
    x1: sourceX + unitX * nodeRadius,
    y1: sourceY + unitY * nodeRadius,
    x2: targetX - unitX * nodeRadius,
    y2: targetY - unitY * nodeRadius,
  }
}

type TaskDependencyGraphViewProps = {
  slug: string
  graph: TaskDependencyGraph
  onOpenTask?: (taskId: string) => void
}

export function TaskDependencyGraphView({
  slug,
  graph,
  onOpenTask,
}: TaskDependencyGraphViewProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filteredNodes = useMemo(() => {
    if (statusFilter === "all") {
      return graph.nodes
    }

    return graph.nodes.filter((node) => node.status === statusFilter)
  }, [graph.nodes, statusFilter])

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes]
  )

  const filteredEdges = useMemo(() => {
    return graph.edges.filter(
      (edge) =>
        filteredNodeIds.has(edge.blockerId) && filteredNodeIds.has(edge.dependentId)
    )
  }, [filteredNodeIds, graph.edges])

  const positions = useMemo(
    () => layoutCircle(filteredNodes, WIDTH, HEIGHT),
    [filteredNodes]
  )

  const focusId = hoveredId ?? selectedId

  const connectedIds = useMemo(() => {
    if (!focusId) {
      return null
    }

    const ids = new Set<string>([focusId])
    filteredEdges.forEach((edge) => {
      if (edge.blockerId === focusId) {
        ids.add(edge.dependentId)
      }
      if (edge.dependentId === focusId) {
        ids.add(edge.blockerId)
      }
    })

    return ids
  }, [filteredEdges, focusId])

  const statusesInGraph = useMemo(() => {
    const statuses = new Set(graph.nodes.map((node) => node.status))
    return TASK_STATUSES.filter((status) => statuses.has(status))
  }, [graph.nodes])

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <Network className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">No tasks to graph</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create tasks and link blocked-by dependencies to visualize your workflow chain.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href={`/projects/${slug}/tasks`}>
              <ArrowLeft className="size-4" />
              Back to tasks
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${slug}/tasks`}>
            <ArrowLeft className="size-4" />
            Task list
          </Link>
        </Button>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "all")}
            className="h-8 min-w-[9rem] rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="all">All statuses</option>
            {statusesInGraph.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_16rem]">
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="max-h-[70vh] min-h-[400px] w-full text-foreground"
            role="img"
            aria-label="Task dependency graph"
          >
            <defs>
              <marker
                id="task-dependency-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <polygon points="0 0, 8 4, 0 8" className="fill-muted-foreground" />
              </marker>
            </defs>

            {filteredEdges.map((edge) => {
              const blocker = positions.get(edge.blockerId)
              const dependent = positions.get(edge.dependentId)
              if (!blocker || !dependent) {
                return null
              }

              const points = edgePoints(blocker.x, blocker.y, dependent.x, dependent.y)
              const dimmed =
                connectedIds !== null &&
                !connectedIds.has(edge.blockerId) &&
                !connectedIds.has(edge.dependentId)

              return (
                <g key={edge.id} opacity={dimmed ? 0.15 : 1}>
                  <line
                    x1={points.x1}
                    y1={points.y1}
                    x2={points.x2}
                    y2={points.y2}
                    stroke="currentColor"
                    strokeWidth={
                      edge.blockerId === focusId || edge.dependentId === focusId ? 2 : 1
                    }
                    markerEnd="url(#task-dependency-arrow)"
                    className="text-muted-foreground/60"
                  />
                  <title>Blocks</title>
                </g>
              )
            })}

            {filteredNodes.map((node) => {
              const position = positions.get(node.id)
              if (!position) {
                return null
              }

              const dimmed = connectedIds !== null && !connectedIds.has(node.id)
              const isSelected = selectedId === node.id
              const color = colorForStatus(node.status)

              return (
                <g
                  key={node.id}
                  transform={`translate(${position.x}, ${position.y})`}
                  opacity={dimmed ? 0.25 : 1}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    if (selectedId === node.id) {
                      if (onOpenTask) {
                        onOpenTask(node.id)
                      } else {
                        router.push(`/projects/${slug}/tasks/graph?task=${node.id}`)
                      }
                      return
                    }

                    setSelectedId(node.id)
                  }}
                >
                  <circle
                    r={NODE_RADIUS}
                    fill={color}
                    stroke={isSelected ? "currentColor" : "transparent"}
                    strokeWidth={3}
                    className="text-foreground"
                  />
                  <text
                    textAnchor="middle"
                    y={-6}
                    className="fill-foreground text-[10px] font-semibold"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.identifier}
                  </text>
                  <text
                    textAnchor="middle"
                    y={NODE_RADIUS + 14}
                    className="fill-foreground text-[11px] font-medium"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.title.length > 18 ? `${node.title.slice(0, 16)}…` : node.title}
                  </text>
                </g>
              )
            })}
          </svg>
          <p className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
            Arrows point from blocker to blocked task. Click a node to highlight its chain. Click
            again to open the task. {filteredEdges.length} dependenc
            {filteredEdges.length === 1 ? "y" : "ies"} shown.
          </p>
        </div>

        <aside className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Selected</h3>
            {selectedId ? (
              (() => {
                const node = graph.nodes.find((task) => task.id === selectedId)
                if (!node) {
                  return null
                }

                const upstream = filteredEdges.filter((edge) => edge.dependentId === selectedId)
                const downstream = filteredEdges.filter((edge) => edge.blockerId === selectedId)

                return (
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="font-medium">
                        <span className="text-muted-foreground">{node.identifier}</span> {node.title}
                      </p>
                      <div className="mt-1">
                        <TaskStatusBadge status={node.status} />
                      </div>
                    </div>
                    {upstream.length > 0 ? (
                      <DependencyList
                        title="Blocked by"
                        edges={upstream}
                        graph={graph}
                        getTaskId={(edge) => edge.blockerId}
                        onSelect={setSelectedId}
                      />
                    ) : null}
                    {downstream.length > 0 ? (
                      <DependencyList
                        title="Blocks"
                        edges={downstream}
                        graph={graph}
                        getTaskId={(edge) => edge.dependentId}
                        onSelect={setSelectedId}
                      />
                    ) : null}
                    {upstream.length === 0 && downstream.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No dependencies in view.</p>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onOpenTask
                          ? onOpenTask(node.id)
                          : router.push(`/projects/${slug}/tasks/graph?task=${node.id}`)
                      }
                    >
                      Open task
                    </Button>
                  </div>
                )
              })()
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Select a node to inspect its dependency chain.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium">Legend</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {statusesInGraph.map((status) => (
                <li key={status} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: colorForStatus(status) }}
                  />
                  {TASK_STATUS_LABELS[status]}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

function DependencyList({
  title,
  edges,
  graph,
  getTaskId,
  onSelect,
}: {
  title: string
  edges: TaskDependencyGraph["edges"]
  graph: TaskDependencyGraph
  getTaskId: (edge: TaskDependencyGraph["edges"][number]) => string
  onSelect: (taskId: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
        {edges.map((edge) => {
          const taskId = getTaskId(edge)
          const task = graph.nodes.find((node) => node.id === taskId)
          if (!task) {
            return null
          }

          return (
            <li key={edge.id}>
              <button
                type="button"
                className="text-left hover:text-foreground hover:underline"
                onClick={() => onSelect(task.id)}
              >
                {task.identifier} {task.title}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
