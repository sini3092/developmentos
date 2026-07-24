import { Inbox } from "lucide-react"

import { InboxChat } from "@/components/inbox/inbox-chat"
import { PageHeader } from "@/components/layout/page-header"
import { getInboxThreadDetail, getInboxView } from "@/lib/auth/inbox-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export const dynamic = "force-dynamic"

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>
}) {
  const { activeWorkspace, user, members } = await requireWorkspaceContext()
  const params = await searchParams
  const { threads } = await getInboxView(activeWorkspace!.id, user.id)

  const selectedThreadId =
    params.t && threads.some((thread) => thread.id === params.t)
      ? params.t
      : params.t ?? threads[0]?.id ?? null
  const detail = selectedThreadId
    ? await getInboxThreadDetail(selectedThreadId, user.id)
    : null
  const selectedThread =
    detail?.thread ??
    threads.find((thread) => thread.id === selectedThreadId) ??
    null

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Inbox"
        description="Chat with Souls and your team. Souls sends a new report each GAME_STATUS sync; teammate chats stay in one thread."
        icon={Inbox}
      />
      <div className="p-6">
        <InboxChat
          workspaceId={activeWorkspace!.id}
          userId={user.id}
          threads={threads}
          members={members.map((member) => ({
            user_id: member.user_id,
            display_name: member.profile?.display_name ?? null,
          }))}
          selectedThreadId={selectedThreadId}
          selectedThread={selectedThread}
          messages={detail?.messages ?? []}
          projectSlug={detail?.project?.slug ?? null}
          projectId={detail?.project?.id ?? null}
          peerName={detail?.peerName ?? null}
        />
      </div>
    </div>
  )
}
