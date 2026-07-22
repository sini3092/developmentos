"use client"

import { useActionState, useState } from "react"

import { updateLoreSections } from "@/lib/actions/knowledge"
import { RichTextEditor } from "@/components/knowledge/rich-text-editor"
import { LoreLinkInserter } from "@/components/lore/lore-link-inserter"
import { LoreCanonChangeFields } from "@/components/lore/lore-canon-change-fields"
import type { CanonStatus, LoreEntry, LoreEntryType, LoreSection } from "@/lib/database.types"
import { getLoreSectionTemplates } from "@/lib/constants/lore-section-templates"
import { getInitialEditorDoc } from "@/lib/utils/tiptap"
import { Button } from "@/components/ui/button"

type LoreSectionsEditorProps = {
  entryId: string
  slug: string
  entrySlug: string
  entryType: LoreEntryType
  canonStatus: CanonStatus
  changeSummary?: string | null
  sections: LoreSection[]
  linkEntries: Array<Pick<LoreEntry, "id" | "name" | "slug">>
}

export function LoreSectionsEditor({
  entryId,
  slug,
  entrySlug,
  entryType,
  canonStatus,
  changeSummary,
  sections,
  linkEntries,
}: LoreSectionsEditorProps) {
  const [state, formAction, pending] = useActionState(updateLoreSections, {})
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)
  const templateHints = new Map(
    getLoreSectionTemplates(entryType).map((template) => [template.key, template.placeholder])
  )

  async function handleInsertLink(snippet: string) {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopiedSnippet(snippet)
    } catch {
      setCopiedSnippet(null)
    }
  }

  return (
    <form action={formAction} className="space-y-6 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Structured sections</h3>
          <p className="text-xs text-muted-foreground">
            Expand lore by section instead of one long document.
          </p>
        </div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save sections"}
        </Button>
      </div>

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
      {copiedSnippet ? (
        <p className="rounded-lg border border-info/30 bg-info/10 px-3 py-2 text-sm text-info">
          Copied <code className="rounded bg-muted px-1">{copiedSnippet}</code> — paste into a section.
        </p>
      ) : null}

      <LoreLinkInserter entries={linkEntries} onInsert={handleInsertLink} />

      <LoreCanonChangeFields canonStatus={canonStatus} defaultSummary={changeSummary} />

      <input type="hidden" name="entryId" value={entryId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="entrySlug" value={entrySlug} />

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.id} className="space-y-2 border-t border-border/40 pt-4 first:border-t-0 first:pt-0">
            <h4 className="text-sm font-medium">{section.title}</h4>
            <RichTextEditor
              name={`section_${section.section_key}`}
              initialDoc={getInitialEditorDoc(
                section.content,
                section.content_json,
                section.content_format
              )}
              placeholder={templateHints.get(section.section_key) ?? "Write this section…"}
            />
          </section>
        ))}
      </div>
    </form>
  )
}
