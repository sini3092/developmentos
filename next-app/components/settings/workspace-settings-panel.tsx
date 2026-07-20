import { Building2 } from "lucide-react"

import type { WorkspaceWithRole } from "@/lib/database.types"
import { WORKSPACE_ROLE_LABELS } from "@/lib/constants/roles"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type WorkspaceSettingsPanelProps = {
  workspace: WorkspaceWithRole
  memberCount: number
  projectCount: number
}

export function WorkspaceSettingsPanel({
  workspace,
  memberCount,
  projectCount,
}: WorkspaceSettingsPanelProps) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4" />
          Workspace
        </CardTitle>
        <CardDescription>Active team workspace and your role.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">{workspace.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Slug</span>
          <span className="font-mono text-xs">{workspace.slug}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Your role</span>
          <span>{WORKSPACE_ROLE_LABELS[workspace.role]}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Members</span>
          <span>{memberCount}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Projects</span>
          <span>{projectCount}</span>
        </div>
      </CardContent>
    </Card>
  )
}
