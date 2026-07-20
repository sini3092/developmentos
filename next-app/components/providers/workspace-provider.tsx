"use client"

import * as React from "react"

import type { WorkspaceContext } from "@/lib/auth/workspace-context"
import { setActiveWorkspace } from "@/lib/actions/workspace"

const WorkspaceContext = React.createContext<WorkspaceContext | null>(null)

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContext
  children: React.ReactNode
}) {
  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = React.useContext(WorkspaceContext)

  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider")
  }

  return context
}

export function useSwitchWorkspace() {
  return React.useCallback(async (slug: string) => {
    await setActiveWorkspace(slug)
    window.location.reload()
  }, [])
}
