"use client"

import { useMemo, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { MENTION_COMPOSER_CLASS, renderMessageBody } from "@/lib/utils/mentions"

type MentionOption = {
  id: string
  label: string
  insertValue: string
  description?: string
}

type MentionTextareaProps = {
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
  members: Array<{ profile: { id: string; display_name: string | null } | null }>
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

const FIELD_CLASS =
  "w-full px-2.5 py-2 text-base leading-normal md:text-sm whitespace-pre-wrap break-words"

function getMentionQuery(value: string, cursor: number) {
  const beforeCursor = value.slice(0, cursor)
  const match = /(?:^|\s)@([A-Za-z0-9_.-]{0,40})$/.exec(beforeCursor)
  if (!match) {
    return null
  }

  return {
    query: match[1] ?? "",
    start: beforeCursor.length - (match[1]?.length ?? 0) - 1,
  }
}

export function MentionTextarea({
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
  required,
  members,
  onKeyDown,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const mentionQuery = useMemo(() => getMentionQuery(value, cursor), [cursor, value])

  const options = useMemo(() => {
    if (!mentionQuery) {
      return []
    }

    const query = mentionQuery.query.toLowerCase()
    const items: MentionOption[] = [
      {
        id: "souls",
        label: "souls",
        insertValue: "souls",
        description: "Souls AI",
      },
      {
        id: "personal",
        label: "personal",
        insertValue: "personal",
        description: "Personal / Codex",
      },
    ]

    for (const member of members) {
      const displayName = member.profile?.display_name?.trim()
      if (!displayName) continue

      const compact = displayName.replace(/\s+/g, "")
      items.push({
        id: member.profile!.id,
        label: displayName,
        insertValue: compact,
        description: "Team member",
      })
    }

    return items.filter((item) => {
      if (!query) return true
      return (
        item.label.toLowerCase().includes(query) || item.insertValue.toLowerCase().includes(query)
      )
    })
  }, [members, mentionQuery])

  const showMenu = Boolean(mentionQuery && options.length > 0)

  function updateCursor() {
    const nextCursor = textareaRef.current?.selectionStart ?? 0
    setCursor(nextCursor)
  }

  function syncScroll() {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  function insertMention(option: MentionOption) {
    if (!mentionQuery) return

    const before = value.slice(0, mentionQuery.start)
    const after = value.slice(cursor)
    const nextValue = `${before}@${option.insertValue} ${after}`
    onChange(nextValue)

    const nextCursor = before.length + option.insertValue.length + 2
    window.setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor)
      setCursor(nextCursor)
    }, 0)
    setActiveIndex(0)
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "relative rounded-lg border border-input bg-transparent shadow-xs transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          "dark:bg-input/30"
        )}
      >
        <div
          ref={mirrorRef}
          aria-hidden
          className={cn(FIELD_CLASS, "pointer-events-none min-h-16 overflow-hidden text-foreground")}
          style={{ minHeight: `${rows * 1.5 + 1}rem` }}
        >
          {value ? (
            renderMessageBody(value).map((part, index) =>
              part.type === "mention" ? (
                <span key={index} className={MENTION_COMPOSER_CLASS}>
                  {part.value}
                </span>
              ) : (
                <span key={index}>{part.value}</span>
              )
            )
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <textarea
          ref={textareaRef}
          name={name}
          rows={rows}
          required={required}
          value={value}
          className={cn(
            FIELD_CLASS,
            "absolute inset-0 resize-none bg-transparent text-transparent caret-foreground outline-none",
            "placeholder:text-transparent"
          )}
          placeholder={placeholder}
          onChange={(event) => {
            onChange(event.target.value)
            setCursor(event.target.selectionStart ?? 0)
          }}
          onClick={updateCursor}
          onKeyUp={updateCursor}
          onScroll={syncScroll}
          onKeyDown={(event) => {
            if (!showMenu) {
              onKeyDown?.(event)
              return
            }

            if (event.key === "ArrowDown") {
              event.preventDefault()
              setActiveIndex((index) => (index + 1) % options.length)
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setActiveIndex((index) => (index - 1 + options.length) % options.length)
            } else if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault()
              insertMention(options[activeIndex] ?? options[0]!)
            } else if (event.key === "Escape") {
              event.preventDefault()
              setCursor(0)
            } else {
              onKeyDown?.(event)
            }
          }}
        />
      </div>

      {showMenu ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-full max-w-sm overflow-hidden rounded-lg border border-border/60 bg-popover shadow-lg">
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm",
                index === activeIndex
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                  : "hover:bg-muted/60"
              )}
              onMouseDown={(event) => {
                event.preventDefault()
                insertMention(option)
              }}
            >
              <span className={cn("font-medium", MENTION_COMPOSER_CLASS)}>@{option.insertValue}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
