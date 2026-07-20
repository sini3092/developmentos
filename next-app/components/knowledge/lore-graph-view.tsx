"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { ArrowLeft, Network } from "lucide-react"

import type { LoreEntryType, LoreGraph, LoreRelationshipType } from "@/lib/database.types"
import { LORE_ENTRY_TYPE_LABELS } from "@/lib/constants/knowledge"
import {
  LORE_RELATIONSHIP_LABELS,
  LORE_RELATIONSHIP_TYPES,
} from "@/lib/constants/lore-relationships"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const NODE_RADIUS = 28
const WIDTH = 900
const HEIGHT = 600

const ENTRY_TYPE_COLORS: Partial<Record<LoreEntryType, string>> = {
  character: "var(--chart-1)",
  location: "var(--chart-2)",
  faction: "var(--chart-3)",
  region: "var(--chart-4)",
  creature: "var(--chart-5)",
}

function colorForEntryType(type: LoreEntryType) {
  return ENTRY_TYPE_COLORS[type] ?? "var(--muted-foreground)"
}

type PositionedNode = LoreGraph["nodes"][number] & { x: number; y: number }

function layoutCircle(
  items: LoreGraph["nodes"],
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

function invertRelationshipLabel(type: LoreRelationshipType): string {
  const inverses: Partial<Record<LoreRelationshipType, string>> = {
    parent_of: "Child of",
    member_of: "Contains",
    located_in: "Contains",
    ally_of: "Ally of",
    enemy_of: "Enemy of",
    related_to: "Related to",
  }

  return inverses[type] ?? LORE_RELATIONSHIP_LABELS[type]
}

type LoreGraphViewProps = {
  slug: string
  graph: LoreGraph
}

export function LoreGraphView({ slug, graph }: LoreGraphViewProps) {
  const router = useRouter()
  const [entryTypeFilter, setEntryTypeFilter] = useState<LoreEntryType | "all">("all")
  const [relationshipFilter, setRelationshipFilter] = useState<LoreRelationshipType | "all">(
    "all"
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filteredNodes = useMemo(() => {
    if (entryTypeFilter === "all") {
      return graph.nodes
    }

    return graph.nodes.filter((node) => node.entry_type === entryTypeFilter)
  }, [entryTypeFilter, graph.nodes])

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes]
  )

  const filteredEdges = useMemo(() => {
    return graph.edges.filter((edge) => {
      if (!filteredNodeIds.has(edge.sourceId) || !filteredNodeIds.has(edge.targetId)) {
        return false
      }

      if (relationshipFilter !== "all" && edge.relationshipType !== relationshipFilter) {
        return false
      }

      return true
    })
  }, [filteredNodeIds, graph.edges, relationshipFilter])

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
      if (edge.sourceId === focusId) {
        ids.add(edge.targetId)
      }
      if (edge.targetId === focusId) {
        ids.add(edge.sourceId)
      }
    })

    return ids
  }, [filteredEdges, focusId])

  const entryTypesInGraph = useMemo(() => {
    const types = new Set(graph.nodes.map((node) => node.entry_type))
    return [...types].sort()
  }, [graph.nodes])

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <Network className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">No lore entries to graph</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add lore entries and relationships to see how your world connects.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href={`/projects/${slug}/lore`}>
              <ArrowLeft className="size-4" />
              Back to lore
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
          <Link href={`/projects/${slug}/lore`}>
            <ArrowLeft className="size-4" />
            Lore library
          </Link>
        </Button>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs">
            <span className="font-medium text-muted-foreground">Entry type</span>
            <select
              value={entryTypeFilter}
              onChange={(event) =>
                setEntryTypeFilter(event.target.value as LoreEntryType | "all")
              }
              className="h-8 min-w-[9rem] rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="all">All types</option>
              {entryTypesInGraph.map((type) => (
                <option key={type} value={type}>
                  {LORE_ENTRY_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-muted-foreground">Relationship</span>
            <select
              value={relationshipFilter}
              onChange={(event) =>
                setRelationshipFilter(event.target.value as LoreRelationshipType | "all")
              }
              className="h-8 min-w-[9rem] rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="all">All relationships</option>
              {LORE_RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {LORE_RELATIONSHIP_LABELS[type]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_16rem]">
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="max-h-[70vh] min-h-[400px] w-full text-foreground"
            role="img"
            aria-label="Lore relationship graph"
          >
            <defs>
              <marker
                id="lore-graph-arrow"
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
              const source = positions.get(edge.sourceId)
              const target = positions.get(edge.targetId)
              if (!source || !target) {
                return null
              }

              const points = edgePoints(source.x, source.y, target.x, target.y)
              const dimmed =
                connectedIds !== null &&
                !connectedIds.has(edge.sourceId) &&
                !connectedIds.has(edge.targetId)

              return (
                <g key={edge.id} opacity={dimmed ? 0.15 : 1}>
                  <line
                    x1={points.x1}
                    y1={points.y1}
                    x2={points.x2}
                    y2={points.y2}
                    stroke="currentColor"
                    strokeWidth={
                      edge.sourceId === focusId || edge.targetId === focusId ? 2 : 1
                    }
                    markerEnd="url(#lore-graph-arrow)"
                    className="text-muted-foreground/60"
                  />
                  <title>
                    {LORE_RELATIONSHIP_LABELS[edge.relationshipType]}
                    {edge.label ? `: ${edge.label}` : ""}
                  </title>
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
              const color = colorForEntryType(node.entry_type)

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
                      router.push(`/projects/${slug}/lore/${node.slug}`)
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
                    y={NODE_RADIUS + 14}
                    className="fill-foreground text-[11px] font-medium"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.name.length > 16 ? `${node.name.slice(0, 14)}…` : node.name}
                  </text>
                </g>
              )
            })}
          </svg>
          <p className="border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
            Click a node to highlight connections. Click again to open the entry.{" "}
            {filteredEdges.length} relationship{filteredEdges.length === 1 ? "" : "s"} shown.
          </p>
        </div>

        <aside className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">Selected</h3>
            {selectedId ? (
              (() => {
                const node = graph.nodes.find((entry) => entry.id === selectedId)
                if (!node) {
                  return null
                }

                const relationships = filteredEdges.filter(
                  (edge) => edge.sourceId === selectedId || edge.targetId === selectedId
                )

                return (
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="font-medium">{node.name}</p>
                      <Badge variant="outline" className="mt-1">
                        {LORE_ENTRY_TYPE_LABELS[node.entry_type]}
                      </Badge>
                    </div>
                    {relationships.length > 0 ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {relationships.map((relationship) => {
                          const outgoing = relationship.sourceId === selectedId
                          const otherId = outgoing
                            ? relationship.targetId
                            : relationship.sourceId
                          const other = graph.nodes.find((entry) => entry.id === otherId)
                          if (!other) {
                            return null
                          }

                          const label = outgoing
                            ? LORE_RELATIONSHIP_LABELS[relationship.relationshipType]
                            : invertRelationshipLabel(relationship.relationshipType)

                          return (
                            <li key={relationship.id}>
                              <button
                                type="button"
                                className="text-left hover:text-foreground hover:underline"
                                onClick={() => setSelectedId(other.id)}
                              >
                                {label} {other.name}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No relationships in view.</p>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/projects/${slug}/lore/${node.slug}`}>Open entry</Link>
                    </Button>
                  </div>
                )
              })()
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Select a node to inspect its connections.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium">Legend</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {entryTypesInGraph.slice(0, 8).map((type) => (
                <li key={type} className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: colorForEntryType(type) }}
                  />
                  {LORE_ENTRY_TYPE_LABELS[type]}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
