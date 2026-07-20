import { Settings } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { AccountSettingsPanel } from "@/components/settings/account-settings-panel"
import { GithubIntegrationPanel } from "@/components/settings/github-integration-panel"
import { PushNotificationsPanel } from "@/components/settings/push-notifications-panel"
import { WorkspaceSettingsPanel } from "@/components/settings/workspace-settings-panel"
import { CreateMemberForm } from "@/components/workspace/create-member-form"
import { getGithubIntegrationStatus } from "@/lib/auth/integrations-context"
import {
  getNotificationPreferences,
  getPushSubscriptionCount,
} from "@/lib/auth/push-context"
import { SoulsAiPanel } from "@/components/settings/souls-ai-panel"
import { CodexBridgePanel } from "@/components/settings/codex-bridge-panel"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"
import { isPushConfigured } from "@/lib/push/vapid"
import { createClient } from "@/lib/supabase/server"

type SettingsPageProps = {
  searchParams: Promise<{ github?: string }>
}

function getGithubStatusMessage(status?: string) {
  switch (status) {
    case "connected":
      return "GitHub connected successfully."
    case "error":
      return "GitHub connection failed. Try again."
    case "not_configured":
      return "GitHub OAuth is not configured on this environment."
    default:
      return null
  }
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const query = await searchParams
  const { activeWorkspace, user, profile, members, projects } = await requireWorkspaceContext()
  const github = await getGithubIntegrationStatus()
  const [preferences, subscriptionCount, workspaceAi] = await Promise.all([
    getNotificationPreferences(user.id),
    getPushSubscriptionCount(user.id),
    activeWorkspace
      ? createClient().then(async (supabase) => {
          const { data } = await supabase
            .from("workspaces")
            .select("openrouter_api_key, openrouter_model")
            .eq("id", activeWorkspace.id)
            .maybeSingle()
          return data
        })
      : Promise.resolve(null),
  ])

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Settings"
        description="Workspace preferences, notifications, theme, and account settings."
        icon={Settings}
      />
      <div className="grid gap-4 p-6 lg:grid-cols-2">
        <AccountSettingsPanel email={user.email} profile={profile} />
        {activeWorkspace ? (
          <WorkspaceSettingsPanel
            workspace={activeWorkspace}
            memberCount={members.length}
            projectCount={projects.length}
          />
        ) : null}
        <GithubIntegrationPanel
          configured={github.configured}
          connected={github.connected}
          username={github.connection?.github_username}
          statusMessage={getGithubStatusMessage(query.github)}
        />
        <PushNotificationsPanel
          preferences={preferences}
          subscriptionCount={subscriptionCount}
          pushConfigured={isPushConfigured()}
        />
        {activeWorkspace ? (
          <SoulsAiPanel
            workspaceId={activeWorkspace.id}
            configured={Boolean(workspaceAi?.openrouter_api_key)}
            model={workspaceAi?.openrouter_model ?? "google/gemini-2.0-flash-001"}
          />
        ) : null}
        <CodexBridgePanel />
        <div className="lg:col-span-2">
          <CreateMemberForm />
        </div>
      </div>
    </div>
  )
}
