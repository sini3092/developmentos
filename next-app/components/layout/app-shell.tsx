"use client"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { CommandPalette } from "@/components/layout/command-palette"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <AppTopbar />
        <main className="flex flex-1 flex-col overflow-auto">{children}</main>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  )
}
