"use client"

import type { KnowledgeContentFormat } from "@/lib/database.types"
import type { LoreLinkTarget } from "@/lib/lore/internal-links"
import { LoreMarkdownContent } from "@/components/lore/lore-markdown-content"
import { RichTextContent } from "@/components/knowledge/rich-text-content"

type LoreRichTextContentProps = {
  content: string
  contentJson?: unknown
  contentFormat?: KnowledgeContentFormat
  projectSlug: string
  linkTargets: LoreLinkTarget[]
  className?: string
}

export function LoreRichTextContent({
  content,
  contentJson,
  contentFormat = "markdown",
  projectSlug,
  linkTargets,
  className,
}: LoreRichTextContentProps) {
  if (content.includes("[[")) {
    return (
      <LoreMarkdownContent
        content={content}
        projectSlug={projectSlug}
        linkTargets={linkTargets}
        className={className}
      />
    )
  }

  return (
    <RichTextContent
      content={content}
      contentJson={contentJson}
      contentFormat={contentFormat}
      className={className}
    />
  )
}
