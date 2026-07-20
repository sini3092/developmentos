"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BookOpen,
  Box,
  FolderKanban,
  Gavel,
  Hash,
  ListTodo,
  Milestone,
  ScrollText,
  Search,
  Target,
  Users,
} from "lucide-react"
import { useEffect, useState } from "react"

import type { SearchResult } from "@/lib/search/types"
import { getSearchTypeLabel } from "@/lib/search/types"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type SearchResultsListProps = {
  results: SearchResult[]
  query: string
}

const typeIcons = {
  task: ListTodo,
  project: FolderKanban,
  initiative: Target,
  milestone: Milestone,
  member: Users,
  design: BookOpen,
  lore: ScrollText,
  channel: Hash,
  asset: Box,
  decision: Gavel,
} as const

export function SearchResultsList({ results, query }: SearchResultsListProps) {
  if (query.trim().length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-10 text-center text-sm text-muted-foreground">
        Type at least 2 characters to search tasks, projects, docs, lore, and team members.
      </p>
    )
  }

  if (results.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-10 text-center text-sm text-muted-foreground">
        No results for &ldquo;{query}&rdquo;.
      </p>
    )
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((groups, result) => {
    const list = groups[result.type] ?? []
    list.push(result)
    groups[result.type] = list
    return groups
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([type, items]) => {
        const Icon = typeIcons[type as keyof typeof typeIcons] ?? Search
        return (
          <section key={type} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="size-4" />
              {getSearchTypeLabel(type as SearchResult["type"])}s
            </h2>
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              {items.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-raised/60"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{result.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{result.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

type SearchFiltersProps = {
  projects: Array<{ id: string; name: string; slug: string }>
}

export function SearchFilters({ projects }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")

  const type = searchParams.get("type") || "all"
  const project = searchParams.get("project") || "all"

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "")
  }, [searchParams])

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              updateParams({ q: query.trim() || null })
            }
          }}
          placeholder="Search everything..."
          className="h-10 pl-9"
        />
      </div>
      <select
        value={type}
        onChange={(event) => updateParams({ type: event.target.value })}
        className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm"
      >
        <option value="all">All types</option>
        <option value="task">Tasks</option>
        <option value="project">Projects</option>
        <option value="initiative">Initiatives</option>
        <option value="milestone">Milestones</option>
        <option value="design">Design docs</option>
        <option value="lore">Lore</option>
        <option value="channel">Channels</option>
        <option value="asset">Assets</option>
        <option value="decision">Decisions</option>
        <option value="member">Members</option>
      </select>
      <select
        value={project}
        onChange={(event) => updateParams({ project: event.target.value })}
        className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm"
      >
        <option value="all">All projects</option>
        {projects.map((item) => (
          <option key={item.id} value={item.slug}>
            {item.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => updateParams({ q: query.trim() || null })}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        )}
      >
        Search
      </button>
    </div>
  )
}
