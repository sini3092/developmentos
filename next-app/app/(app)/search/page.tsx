import { Suspense } from "react"
import { Search } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { SearchFilters, SearchResultsList } from "@/components/search/search-ui"
import { getSearchProjects, searchWorkspace, type SearchResultType } from "@/lib/auth/search-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type SearchPageProps = {
  searchParams: Promise<{ q?: string; type?: string; project?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = await searchParams
  const { activeWorkspace } = await requireWorkspaceContext()
  const searchQuery = query.q?.trim() ?? ""

  const [results, projects] = await Promise.all([
    searchQuery.length >= 2
      ? searchWorkspace(searchQuery, {
          type: (query.type as SearchResultType) || "all",
          projectSlug: query.project,
          limit: 12,
        })
      : Promise.resolve([]),
    getSearchProjects(activeWorkspace!.id),
  ])

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Search"
        description="Find tasks, projects, roadmap items, documents, lore, channels, and team members."
        icon={Search}
      />
      <div className="space-y-6 p-6">
        <Suspense fallback={null}>
          <SearchFilters projects={projects} />
        </Suspense>
        <SearchResultsList results={results} query={searchQuery} />
      </div>
    </div>
  )
}
