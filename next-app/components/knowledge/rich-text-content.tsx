"use client"

import Link from "@tiptap/extension-link"
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import type { KnowledgeContentFormat } from "@/lib/database.types"
import { getInitialEditorDoc } from "@/lib/utils/tiptap"
import { MarkdownContent } from "@/components/knowledge/markdown-content"
import { cn } from "@/lib/utils"

type RichTextContentProps = {
  content: string
  contentJson?: unknown
  contentFormat?: KnowledgeContentFormat
  className?: string
}

export function RichTextContent({
  content,
  contentJson,
  contentFormat = "markdown",
  className,
}: RichTextContentProps) {
  if (contentFormat !== "tiptap") {
    return <MarkdownContent content={content} className={className} />
  }

  return <TiptapReadOnly doc={getInitialEditorDoc(content, contentJson, contentFormat)} className={className} />
}

function TiptapReadOnly({ doc, className }: { doc: JSONContent; className?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
    ],
    content: doc,
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none text-foreground/90 focus:outline-none",
          className
        ),
      },
    },
    immediatelyRender: false,
  })

  if (!editor) {
    return null
  }

  return <EditorContent editor={editor} />
}
