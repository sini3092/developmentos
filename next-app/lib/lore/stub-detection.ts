const IMPORTED_PLACEHOLDER_RE = /^imported from everwood board plan/i

export function isLoreStub(entry: {
  summary?: string | null
  content?: string | null
}) {
  const summary = entry.summary?.trim() ?? ""
  const content = entry.content?.trim() ?? ""

  if (IMPORTED_PLACEHOLDER_RE.test(summary) && content.length < 120) {
    return true
  }

  if (!content && summary.length < 100) {
    return true
  }

  return content.length < 80 && summary.length < 120
}

export function loreStubReason(entry: {
  summary?: string | null
  content?: string | null
}) {
  const summary = entry.summary?.trim() ?? ""
  if (IMPORTED_PLACEHOLDER_RE.test(summary)) {
    return "import_placeholder"
  }
  if (!entry.content?.trim()) {
    return "missing_content"
  }
  return "thin_content"
}
