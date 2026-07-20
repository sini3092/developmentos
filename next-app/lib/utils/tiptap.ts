import type { JSONContent } from "@tiptap/react"

import type { KnowledgeContentFormat } from "@/lib/database.types"

export function markdownToTiptapDoc(markdown: string): JSONContent {
  const trimmed = markdown.trim()
  if (!trimmed) {
    return { type: "doc", content: [{ type: "paragraph" }] }
  }

  const blocks = trimmed.split(/\n{2,}/)
  const content: JSONContent[] = []

  for (const block of blocks) {
    const lines = block.split("\n")
    const firstLine = lines[0]?.trim() ?? ""

    if (firstLine.startsWith("# ")) {
      content.push({
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: firstLine.slice(2) }],
      })
      continue
    }

    if (firstLine.startsWith("## ")) {
      content.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: firstLine.slice(3) }],
      })
      continue
    }

    if (firstLine.startsWith("### ")) {
      content.push({
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: firstLine.slice(4) }],
      })
      continue
    }

    if (lines.every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* "))) {
      content.push({
        type: "bulletList",
        content: lines.map((line) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: line.trim().replace(/^[-*]\s+/, "") }],
            },
          ],
        })),
      })
      continue
    }

    content.push({
      type: "paragraph",
      content: [{ type: "text", text: block }],
    })
  }

  return { type: "doc", content }
}

export function tiptapDocToPlainText(doc: JSONContent | null | undefined): string {
  if (!doc) {
    return ""
  }

  const parts: string[] = []

  function walk(node: JSONContent) {
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text)
      return
    }

    if (node.type === "paragraph" || node.type === "heading") {
      node.content?.forEach(walk)
      parts.push("\n")
      return
    }

    if (node.type === "bulletList" || node.type === "orderedList") {
      node.content?.forEach((item) => {
        parts.push("- ")
        item.content?.forEach(walk)
      })
      parts.push("\n")
      return
    }

    node.content?.forEach(walk)
  }

  doc.content?.forEach(walk)
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim()
}

export function parseEditorPayload(
  contentJsonRaw: string,
  contentFormat: KnowledgeContentFormat
): { contentJson: JSONContent | null; content: string; contentFormat: KnowledgeContentFormat } {
  if (contentFormat !== "tiptap" || !contentJsonRaw.trim()) {
    return { contentJson: null, content: contentJsonRaw, contentFormat: "markdown" }
  }

  try {
    const contentJson = JSON.parse(contentJsonRaw) as JSONContent
    return {
      contentJson,
      content: tiptapDocToPlainText(contentJson),
      contentFormat: "tiptap",
    }
  } catch {
    return { contentJson: null, content: contentJsonRaw, contentFormat: "markdown" }
  }
}

export function getInitialEditorDoc(
  content: string,
  contentJson: unknown,
  contentFormat: KnowledgeContentFormat
): JSONContent {
  if (contentFormat === "tiptap" && contentJson && typeof contentJson === "object") {
    return contentJson as JSONContent
  }

  return markdownToTiptapDoc(content)
}
