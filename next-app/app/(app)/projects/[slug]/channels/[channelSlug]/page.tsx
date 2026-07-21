import { MessageSquare } from "lucide-react"

import { ChannelFeed } from "@/components/channels/channel-feed"
import { ChannelSidebar } from "@/components/channels/channel-sidebar"
import { ChannelsEmptyState } from "@/components/channels/channels-empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { getProjectChannels, requireChannel } from "@/lib/auth/channels-context"
import { requireProject } from "@/lib/auth/project-context"

export const dynamic = "force-dynamic"

type ChannelPageProps = {
  params: Promise<{ slug: string; channelSlug: string }>
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { slug, channelSlug } = await params
  const { project, members, canManage, currentMembership } = await requireProject(slug)
  const channels = await getProjectChannels(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  if (channels.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader
          title="Channels"
          description={`Team discussion for ${project.name}`}
          icon={MessageSquare}
        />
        <ProjectNav slug={slug} canManage={canManage} />
        <ChannelsEmptyState projectId={project.id} slug={slug} canEdit={canEdit} />
      </div>
    )
  }

  const channel = await requireChannel(project.id, channelSlug)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Channels"
          description={`Team discussion for ${project.name}`}
          icon={MessageSquare}
        />
        <ProjectNav slug={slug} canManage={canManage} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <ChannelSidebar slug={slug} channels={channels} activeChannelSlug={channelSlug} />
        <ChannelFeed
          channel={channel}
          slug={slug}
          workspaceId={project.workspace_id}
          projectId={project.id}
          members={members}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
