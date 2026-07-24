import { cn } from "@/lib/utils"

type ParsedSection = {
  title?: string
  lines: string[]
}

function parseSoulsInboxBody(body: string): { intro: string; sections: ParsedSection[] } {
  const chunks = body.split(/\n\n+/).map((chunk) => chunk.trim()).filter(Boolean)
  if (chunks.length === 0) {
    return { intro: "", sections: [] }
  }

  const intro = chunks[0]
  const sections: ParsedSection[] = []

  for (const chunk of chunks.slice(1)) {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean)
    if (lines.length === 0) {
      continue
    }

    const first = lines[0]
    if (first.endsWith(":") && !first.startsWith("-")) {
      sections.push({
        title: first.replace(/:$/, ""),
        lines: lines.slice(1),
      })
      continue
    }

    sections.push({ lines })
  }

  return { intro, sections }
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60_000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`

  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function SoulsInboxMessageBody({
  body,
  createdAt,
  title,
  compact = false,
}: {
  body: string
  createdAt: string
  title?: string | null
  compact?: boolean
}) {
  const { intro, sections } = parseSoulsInboxBody(body)

  return (
    <div className="space-y-4">
      {title ? (
        <p className="font-serif text-base font-semibold leading-snug text-foreground">
          {title}
        </p>
      ) : null}
      <p
        className={cn(
          "text-sm leading-relaxed text-foreground/90",
          compact && "line-clamp-4"
        )}
      >
        {intro}
      </p>

      {!compact
        ? sections.map((section) => (
            <div key={section.title ?? section.lines[0]} className="space-y-2">
              {section.title ? (
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {section.title}
                </p>
              ) : null}
              <ul className="space-y-1.5">
                {section.lines.map((line) => (
                  <li
                    key={line}
                    className="rounded-lg border border-border/50 bg-background/60 px-3 py-2 text-sm text-foreground/85"
                  >
                    {line.replace(/^- /, "")}
                  </li>
                ))}
              </ul>
            </div>
          ))
        : null}

      <p className="text-xs text-muted-foreground">{formatRelativeTime(createdAt)}</p>
    </div>
  )
}
