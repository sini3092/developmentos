"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ArrowLeft, Link2 } from "lucide-react"

import { linkDecisionItem, unlinkDecisionItem, updateDecision } from "@/lib/actions/decisions"
import type { DecisionDetail, ProjectMemberWithProfile, Task } from "@/lib/database.types"
import {
  DECISION_LINK_TYPE_LABELS,
  DECISION_LINK_TYPES,
  DECISION_STATUSES,
  DECISION_STATUS_LABELS,
} from "@/lib/constants/decisions"
import { MarkdownContent } from "@/components/knowledge/markdown-content"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type DecisionDetailEditorProps = {
  decision: DecisionDetail
  slug: string
  members: ProjectMemberWithProfile[]
  projectTasks: Array<Pick<Task, "id" | "title" | "identifier">>
  canEdit: boolean
}

export function DecisionDetailHeader({ slug }: { slug: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={`/projects/${slug}/decisions`}>
        <ArrowLeft className="size-4" />
        Back to decisions
      </Link>
    </Button>
  )
}

export function DecisionDetailEditor({
  decision,
  slug,
  members,
  projectTasks,
  canEdit,
}: DecisionDetailEditorProps) {
  const [state, formAction, pending] = useActionState(updateDecision, {})
  const [linkState, linkAction, linking] = useActionState(linkDecisionItem, {})
  const [, unlinkAction] = useActionState(unlinkDecisionItem, {})
  const linkedTaskIds = new Set(
    decision.links.filter((link) => link.link_type === "task").map((link) => link.linked_id)
  )
  const availableTasks = projectTasks.filter((task) => !linkedTaskIds.has(task.id))

  if (!canEdit) {
    return (
      <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="space-y-6 rounded-xl border border-border/60 bg-card p-6 shadow-xs">
          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Context</h3>
            <div className="mt-2">
              {decision.context ? (
                <MarkdownContent content={decision.context} />
              ) : (
                <p className="text-sm text-muted-foreground">No context provided.</p>
              )}
            </div>
          </section>
          <section>
            <h3 className="text-sm font-medium text-muted-foreground">Problem</h3>
            <p className="mt-2 text-sm leading-relaxed">{decision.problem || "—"}</p>
          </section>
          {decision.options ? (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground">Options considered</h3>
              <div className="mt-2">
                <MarkdownContent content={decision.options} />
              </div>
            </section>
          ) : null}
          {decision.selected_option ? (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground">Selected option</h3>
              <p className="mt-2 text-sm font-medium">{decision.selected_option}</p>
            </section>
          ) : null}
          {decision.reasoning ? (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground">Reasoning</h3>
              <div className="mt-2">
                <MarkdownContent content={decision.reasoning} />
              </div>
            </section>
          ) : null}
        </article>
        <aside className="space-y-4">
          <DecisionMetaCard decision={decision} />
          <DecisionLinksCard decision={decision} slug={slug} canEdit={false} />
        </aside>
      </div>
    )
  }

  return (
    <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={formAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-xs">
        <input type="hidden" name="decisionId" value={decision.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="decisionSlug" value={decision.slug} />
        {state.error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {state.success}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={decision.title} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={decision.status}
              className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {DECISION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {DECISION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ownerId">Owner</Label>
            <select
              id="ownerId"
              name="ownerId"
              defaultValue={decision.owner_id ?? ""}
              className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profile?.display_name ?? member.user_id}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="context">Context</Label>
          <Textarea id="context" name="context" rows={3} defaultValue={decision.context} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="problem">Problem</Label>
          <Textarea id="problem" name="problem" rows={2} defaultValue={decision.problem} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="options">Options considered</Label>
          <Textarea
            id="options"
            name="options"
            rows={4}
            defaultValue={decision.options}
            placeholder="- Option A&#10;- Option B"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="selectedOption">Selected option</Label>
          <Input id="selectedOption" name="selectedOption" defaultValue={decision.selected_option ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reasoning">Reasoning</Label>
          <Textarea id="reasoning" name="reasoning" rows={3} defaultValue={decision.reasoning ?? ""} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <aside className="space-y-4">
        <DecisionMetaCard decision={decision} />
        <DecisionLinksCard decision={decision} slug={slug} canEdit unlinkAction={unlinkAction} />
        {availableTasks.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
            <h3 className="text-sm font-medium">Link task</h3>
            {linkState.error ? (
              <p className="mt-2 text-sm text-danger">{linkState.error}</p>
            ) : null}
            {linkState.success ? (
              <p className="mt-2 text-sm text-success">{linkState.success}</p>
            ) : null}
            <form action={linkAction} className="mt-3 space-y-3">
              <input type="hidden" name="decisionId" value={decision.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="decisionSlug" value={decision.slug} />
              <input type="hidden" name="linkType" value="task" />
              <select
                name="linkedId"
                className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                required
              >
                <option value="">Select task…</option>
                {availableTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.identifier} — {task.title}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline" disabled={linking}>
                {linking ? "Linking…" : "Link task"}
              </Button>
            </form>
          </div>
        ) : null}
      </aside>
    </div>
  )
}

function DecisionMetaCard({ decision }: { decision: DecisionDetail }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="text-sm font-medium">Details</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="secondary">{DECISION_STATUS_LABELS[decision.status]}</Badge>
      </div>
      {decision.owner ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Owner: <span className="text-foreground">{decision.owner.display_name}</span>
        </p>
      ) : null}
    </div>
  )
}

function DecisionLinksCard({
  decision,
  slug,
  canEdit,
  unlinkAction,
}: {
  decision: DecisionDetail
  slug: string
  canEdit: boolean
  unlinkAction?: (payload: FormData) => void
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="size-4" />
        Related items
      </h3>
      {decision.links.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No linked items.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {decision.links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <Badge variant="outline" className="mb-1 text-xs">
                  {DECISION_LINK_TYPE_LABELS[link.link_type]}
                </Badge>
                <Link href={link.href} className="block truncate hover:underline">
                  {link.title}
                </Link>
              </div>
              {canEdit && unlinkAction ? (
                <form action={unlinkAction}>
                  <input type="hidden" name="linkId" value={link.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="decisionSlug" value={decision.slug} />
                  <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    Remove
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canEdit ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Link types supported: {DECISION_LINK_TYPES.map((t) => DECISION_LINK_TYPE_LABELS[t]).join(", ")}.
          Task linking is available below.
        </p>
      ) : null}
    </div>
  )
}
