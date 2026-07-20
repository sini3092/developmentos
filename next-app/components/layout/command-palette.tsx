"use client"



import { useRouter } from "next/navigation"

import * as React from "react"

import {

  BookOpen,

  Box,

  Calendar,

  FolderKanban,

  Gavel,

  Hash,

  Home,

  Inbox,

  ListTodo,

  Milestone,

  Moon,

  Plus,

  ScrollText,

  Search,

  Settings,

  Sun,

  Target,

  Users,

} from "lucide-react"

import { useTheme } from "next-themes"



import {

  Command,

  CommandDialog,

  CommandEmpty,

  CommandGroup,

  CommandInput,

  CommandItem,

  CommandList,

  CommandSeparator,

  CommandShortcut,

} from "@/components/ui/command"

import type { SearchResult } from "@/lib/search/types"
import { getSearchTypeLabel } from "@/lib/search/types"

import { useUiStore } from "@/lib/stores/ui-store"



const navigationCommands = [

  { label: "Home", href: "/", icon: Home },

  { label: "My Work", href: "/my-work", icon: ListTodo },

  { label: "Inbox", href: "/inbox", icon: Inbox },

  { label: "Search", href: "/search", icon: Search },

  { label: "Projects", href: "/projects", icon: FolderKanban },

  { label: "Team", href: "/team", icon: Users },

  { label: "Calendar", href: "/calendar", icon: Calendar },

  { label: "Settings", href: "/settings", icon: Settings },

] as const



const searchIcons = {

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



export function CommandPalette() {

  const router = useRouter()

  const { resolvedTheme, setTheme } = useTheme()

  const open = useUiStore((state) => state.commandPaletteOpen)

  const setOpen = useUiStore((state) => state.setCommandPaletteOpen)

  const [search, setSearch] = React.useState("")

  const [results, setResults] = React.useState<SearchResult[]>([])

  const [loading, setLoading] = React.useState(false)



  React.useEffect(() => {

    function onKeyDown(event: KeyboardEvent) {

      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {

        event.preventDefault()

        setOpen(true)

      }

    }



    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)

  }, [setOpen])



  React.useEffect(() => {

    if (!open) {

      setSearch("")

      setResults([])

      return

    }



    const trimmed = search.trim()

    if (trimmed.length < 2) {

      setResults([])

      setLoading(false)

      return

    }



    const controller = new AbortController()

    const timer = window.setTimeout(async () => {

      setLoading(true)

      try {

        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {

          signal: controller.signal,

        })

        if (!response.ok) {

          setResults([])

          return

        }

        const data = (await response.json()) as { results?: SearchResult[] }

        setResults(data.results ?? [])

      } catch {

        if (!controller.signal.aborted) {

          setResults([])

        }

      } finally {

        if (!controller.signal.aborted) {

          setLoading(false)

        }

      }

    }, 250)



    return () => {

      controller.abort()

      window.clearTimeout(timer)

    }

  }, [search, open])



  function runCommand(command: () => void) {

    setOpen(false)

    setSearch("")

    setResults([])

    command()

  }



  const groupedResults = results.reduce<Record<string, SearchResult[]>>((groups, result) => {

    const list = groups[result.type] ?? []

    list.push(result)

    groups[result.type] = list

    return groups

  }, {})



  const isSearching = search.trim().length >= 2



  return (

    <CommandDialog open={open} onOpenChange={setOpen}>

      <Command shouldFilter={false}>

        <CommandInput

          placeholder="Search tasks, docs, lore... or run a command"

          value={search}

          onValueChange={setSearch}

        />

        <CommandList>

          <CommandEmpty>

            {loading ? "Searching..." : isSearching ? "No results found." : "No matching command."}

          </CommandEmpty>



          {isSearching ? (

            <>

              {Object.entries(groupedResults).map(([type, items]) => {

                const Icon = searchIcons[type as keyof typeof searchIcons] ?? Search

                return (

                  <CommandGroup

                    key={type}

                    heading={`${getSearchTypeLabel(type as SearchResult["type"])}s`}

                  >

                    {items.map((result) => (

                      <CommandItem

                        key={`${result.type}-${result.id}`}

                        onSelect={() => runCommand(() => router.push(result.href))}

                      >

                        <Icon />

                        <span className="truncate">{result.title}</span>

                        <span className="ml-auto truncate text-xs text-muted-foreground">

                          {result.subtitle}

                        </span>

                      </CommandItem>

                    ))}

                  </CommandGroup>

                )

              })}

              <CommandSeparator />

              <CommandGroup heading="Search">

                <CommandItem

                  onSelect={() =>

                    runCommand(() =>

                      router.push(`/search?q=${encodeURIComponent(search.trim())}`)

                    )

                  }

                >

                  <Search />

                  View all results for &ldquo;{search.trim()}&rdquo;

                </CommandItem>

              </CommandGroup>

            </>

          ) : (

            <>

              <CommandGroup heading="Create">

                <CommandItem

                  onSelect={() => runCommand(() => router.push("/projects"))}

                >

                  <Plus />

                  Create task

                  <CommandShortcut>T</CommandShortcut>

                </CommandItem>

                <CommandItem

                  onSelect={() => runCommand(() => router.push("/projects"))}

                >

                  <BookOpen />

                  Create document

                </CommandItem>

                <CommandItem

                  onSelect={() => runCommand(() => router.push("/projects"))}

                >

                  <ScrollText />

                  Create lore entry

                </CommandItem>

              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Navigate">

                {navigationCommands.map((item) => (

                  <CommandItem

                    key={item.href}

                    onSelect={() => runCommand(() => router.push(item.href))}

                  >

                    <item.icon />

                    {item.label}

                  </CommandItem>

                ))}

              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Actions">

                <CommandItem

                  onSelect={() =>

                    runCommand(() =>

                      setTheme(resolvedTheme === "dark" ? "light" : "dark")

                    )

                  }

                >

                  {resolvedTheme === "dark" ? <Sun /> : <Moon />}

                  Toggle theme

                </CommandItem>

              </CommandGroup>

            </>

          )}

        </CommandList>

      </Command>

    </CommandDialog>

  )

}


