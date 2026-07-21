"use client"

import { Suspense } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { CommandPalette } from "@/components/layout/command-palette"
import { NavigationProgress } from "@/components/layout/navigation-progress"
import { useIsPwa } from "@/hooks/use-pwa"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const isPwa = useIsPwa()

  return (
    <SidebarProvider defaultOpen={!isPwa} className="h-svh max-h-svh min-w-0 overflow-hidden">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <AppSidebar />
      <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <AppTopbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  )
}
