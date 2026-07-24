export type GameStatusCommitFiles = {
  message?: string
  added?: string[]
  modified?: string[]
  removed?: string[]
}

export function normalizeGameStatusPath(path: string) {
  return path.replace(/\\/g, "/").toLowerCase()
}

export function pathsTouchGameStatus(paths: string[] | undefined, statusPath: string) {
  if (!paths?.length) {
    return false
  }

  const normalizedStatusPath = normalizeGameStatusPath(statusPath)
  const fileName = normalizedStatusPath.split("/").pop() ?? normalizedStatusPath

  return paths.some((rawPath) => {
    const normalized = rawPath.replace(/\\/g, "/").toLowerCase()
    return (
      normalized === normalizedStatusPath ||
      normalized.endsWith(`/${fileName}`) ||
      normalized === fileName
    )
  })
}

export function commitMessageTouchesGameStatus(message: string) {
  return /game[_\s-]?status|living game status|game-status-guide/i.test(message)
}

export function commitTouchesGameStatus(commit: GameStatusCommitFiles, statusPath: string) {
  return (
    pathsTouchGameStatus(commit.added, statusPath) ||
    pathsTouchGameStatus(commit.modified, statusPath) ||
    pathsTouchGameStatus(commit.removed, statusPath) ||
    (commit.message ? commitMessageTouchesGameStatus(commit.message) : false)
  )
}

export function gameStatusTouched(
  commits: GameStatusCommitFiles[],
  statusPath: string,
  headCommit?: GameStatusCommitFiles | null
) {
  if (headCommit && commitTouchesGameStatus(headCommit, statusPath)) {
    return true
  }

  return commits.some((commit) => commitTouchesGameStatus(commit, statusPath))
}
