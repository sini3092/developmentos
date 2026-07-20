import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { PreferencesProvider } from "@/components/providers/preferences-provider"
import { WorkspaceProvider } from "@/components/providers/workspace-provider"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await requireWorkspaceContext()

  if (!context.profile?.display_name?.trim()) {
    redirect("/onboarding/profile")
  }

  return (
    <WorkspaceProvider value={context}>
      <PreferencesProvider />
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  )
}
