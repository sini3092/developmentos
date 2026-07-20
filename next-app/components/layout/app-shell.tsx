"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { CommandPalette } from "@/components/layout/command-palette"
import { useIsPwa } from "@/hooks/use-pwa"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  const isPwa = useIsPwa()

  return (
    <SidebarProvider defaultOpen={!isPwa} className="min-w-0 overflow-x-hidden">
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <AppTopbar />
        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  )
}
