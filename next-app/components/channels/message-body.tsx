import { MarkdownContent } from "@/components/knowledge/markdown-content"
import { MENTION_CHIP_CLASS, renderMessageBody } from "@/lib/utils/mentions"

type MessageBodyProps = {
  body: string
  agentName?: string | null
}

export function MessageBody({ body, agentName }: MessageBodyProps) {
  if (agentName) {
    return (
      <div className="rounded-lg border border-border/50 bg-surface-raised/40 px-3 py-2.5">
        <MarkdownContent content={body} />
      </div>
    )
  }

  return (
    <p className="text-sm whitespace-pre-wrap">
      {renderMessageBody(body).map((part, index) =>
        part.type === "mention" ? (
          <span key={index} className={MENTION_CHIP_CLASS}>
            {part.value}
          </span>
        ) : (
          <span key={index}>{part.value}</span>
        )
      )}
    </p>
  )
}
