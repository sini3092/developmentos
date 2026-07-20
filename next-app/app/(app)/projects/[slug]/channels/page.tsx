import { redirect } from "next/navigation"
import { MessageSquare } from "lucide-react"

import { ChannelsEmptyState } from "@/components/channels/channels-empty-state"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { requireProject } from "@/lib/auth/project-context"
import { getProjectChannels } from "@/lib/auth/channels-context"

type ChannelsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ChannelsPage({ params }: ChannelsPageProps) {
  const { slug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
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

  const defaultChannel = channels.find((channel) => channel.is_default) ?? channels[0]
  redirect(`/projects/${slug}/channels/${defaultChannel.slug}`)
}
