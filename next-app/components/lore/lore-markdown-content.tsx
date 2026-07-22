"use client"

import type { ReactNode } from "react"

import { LoreEntryLink } from "@/components/lore/lore-entry-link"
import {
  buildLoreLinkIndex,
  resolveWikiLinkToken,
  type LoreLinkTarget,
} from "@/lib/lore/internal-links"

type LoreMarkdownContentProps = {
  content: string
  projectSlug: string
  linkTargets: LoreLinkTarget[]
  className?: string
}

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[\[[^\]]+\]\]|\*[^*]+\*)/g

function renderLoreInline(
  text: string,
  projectSlug: string,
  linkIndex: ReturnType<typeof buildLoreLinkIndex>
) {
  const parts = text.split(INLINE_PATTERN)

  return parts.map((part, index) => {
    const wikiMatch = part.match(/^\[\[([^\]]+)\]\]$/)
    if (wikiMatch) {
      const target = resolveWikiLinkToken(wikiMatch[1], linkIndex)
      if (target) {
        const label = wikiMatch[1].includes("|")
          ? wikiMatch[1].split("|")[0]?.trim()
          : undefined
        return (
          <LoreEntryLink
            key={index}
            projectSlug={projectSlug}
            target={target}
            label={label && label !== target.name ? label : undefined}
          />
        )
      }
      return (
        <span key={index} className="text-muted-foreground">
          {part}
        </span>
      )
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline underline-offset-2"
        >
          {linkMatch[1]}
        </a>
      )
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }

    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      )
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    return part
  })
}

export function LoreMarkdownContent({
  content,
  projectSlug,
  linkTargets,
  className = "",
}: LoreMarkdownContentProps) {
  const linkIndex = buildLoreLinkIndex(linkTargets)
  const lines = content.split("\n")
  const elements: ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  function flushList() {
    if (listItems.length === 0) return
    elements.push(
      <ul key={key++} className="my-2 list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed">
            {renderLoreInline(item, projectSlug, linkIndex)}
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (trimmed.startsWith("# ")) {
      flushList()
      elements.push(
        <h1 key={key++} className="mt-4 mb-2 text-xl font-semibold first:mt-0">
          {renderLoreInline(trimmed.slice(2), projectSlug, linkIndex)}
        </h1>
      )
      continue
    }

    if (trimmed.startsWith("## ")) {
      flushList()
      elements.push(
        <h2 key={key++} className="mt-4 mb-2 text-lg font-semibold first:mt-0">
          {renderLoreInline(trimmed.slice(3), projectSlug, linkIndex)}
        </h2>
      )
      continue
    }

    if (trimmed.startsWith("### ")) {
      flushList()
      elements.push(
        <h3 key={key++} className="mt-3 mb-1 text-base font-medium first:mt-0">
          {renderLoreInline(trimmed.slice(4), projectSlug, linkIndex)}
        </h3>
      )
      continue
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listItems.push(trimmed.slice(2))
      continue
    }

    flushList()

    if (trimmed === "") {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    elements.push(
      <p key={key++} className="text-sm leading-relaxed">
        {renderLoreInline(line, projectSlug, linkIndex)}
      </p>
    )
  }

  flushList()

  return (
    <div className={`whitespace-pre-wrap text-foreground/90 ${className}`.trim()}>{elements}</div>
  )
}
