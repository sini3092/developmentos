"use client"

import type { LoreLinkTarget } from "@/lib/lore/internal-links"
import { LoreRichTextContent } from "@/components/lore/lore-rich-text-content"
import type { LoreSection } from "@/lib/database.types"
import { cn } from "@/lib/utils"

type LoreSectionsReaderProps = {
  sections: LoreSection[]
  projectSlug: string
  linkTargets: LoreLinkTarget[]
  className?: string
}

function sectionHasContent(section: LoreSection) {
  if (section.content.trim()) {
    return true
  }

  return Boolean(section.content_json)
}

export function LoreSectionsReader({
  sections,
  projectSlug,
  linkTargets,
  className,
}: LoreSectionsReaderProps) {
  const visibleSections = sections.filter(sectionHasContent)

  if (visibleSections.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-10", className)}>
      {visibleSections.map((section) => (
        <section key={section.id} id={`section-${section.section_key}`} className="scroll-mt-24">
          <h2 className="mb-4 font-serif text-2xl font-semibold tracking-tight">{section.title}</h2>
          <LoreRichTextContent
            content={section.content}
            contentJson={section.content_json}
            contentFormat={section.content_format}
            projectSlug={projectSlug}
            linkTargets={linkTargets}
          />
        </section>
      ))}
    </div>
  )
}

export function LoreSectionsTableOfContents({ sections }: { sections: LoreSection[] }) {
  const visibleSections = sections.filter(sectionHasContent)

  if (visibleSections.length < 2) {
    return null
  }

  return (
    <nav className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="text-sm font-medium">On this page</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {visibleSections.map((section) => (
          <li key={section.id}>
            <a
              href={`#section-${section.section_key}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
