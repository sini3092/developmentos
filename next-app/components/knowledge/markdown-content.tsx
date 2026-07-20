import type { ReactNode } from "react"

type MarkdownContentProps = {
  content: string
  className?: string
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)

  return parts.map((part, index) => {
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

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  const lines = content.split("\n")
  const elements: ReactNode[] = []
  let listItems: string[] = []
  let key = 0

  function flushList() {
    if (listItems.length === 0) {
      return
    }
    elements.push(
      <ul key={key++} className="my-2 list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith("# ")) {
      flushList()
      elements.push(
        <h1 key={key++} className="mt-4 mb-2 text-xl font-semibold first:mt-0">
          {renderInline(trimmed.slice(2))}
        </h1>
      )
      continue
    }

    if (trimmed.startsWith("## ")) {
      flushList()
      elements.push(
        <h2 key={key++} className="mt-4 mb-2 text-lg font-semibold first:mt-0">
          {renderInline(trimmed.slice(3))}
        </h2>
      )
      continue
    }

    if (trimmed.startsWith("### ")) {
      flushList()
      elements.push(
        <h3 key={key++} className="mt-3 mb-1 text-base font-medium first:mt-0">
          {renderInline(trimmed.slice(4))}
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
        {renderInline(line)}
      </p>
    )
  }

  flushList()

  return (
    <div className={`whitespace-pre-wrap text-foreground/90 ${className}`.trim()}>
      {elements}
    </div>
  )
}
