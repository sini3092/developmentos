export function normalizeRepoDocPath(path: string) {
  return path.replace(/\\/g, "/").toLowerCase()
}

export function pathsTouchDocFile(paths: string[] | undefined, docPath: string) {
  if (!paths?.length) {
    return false
  }

  const normalizedDocPath = normalizeRepoDocPath(docPath)
  const fileName = normalizedDocPath.split("/").pop() ?? normalizedDocPath

  return paths.some((rawPath) => {
    const normalized = rawPath.replace(/\\/g, "/").toLowerCase()
    return (
      normalized === normalizedDocPath ||
      normalized.endsWith(`/${fileName}`) ||
      normalized === fileName
    )
  })
}

export function commitMessageTouchesDoc(message: string, hints: string[]) {
  const lower = message.toLowerCase()
  return hints.some((hint) => lower.includes(hint.toLowerCase()))
}

export type CommitFilePaths = {
  message?: string
  added?: string[]
  modified?: string[]
  removed?: string[]
}

export function commitTouchesDocFile(commit: CommitFilePaths, docPath: string, messageHints: string[] = []) {
  return (
    pathsTouchDocFile(commit.added, docPath) ||
    pathsTouchDocFile(commit.modified, docPath) ||
    pathsTouchDocFile(commit.removed, docPath) ||
    (commit.message ? commitMessageTouchesDoc(commit.message, messageHints) : false)
  )
}
