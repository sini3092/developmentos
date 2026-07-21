export type TextDiffStats = {
  additions: number
  deletions: number
  patch: string
}

function trimPatchLines(lines: string[], maxLines: number) {
  if (lines.length <= maxLines) {
    return lines
  }

  const head = Math.ceil(maxLines * 0.6)
  const tail = maxLines - head - 1
  return [...lines.slice(0, head), "…", ...lines.slice(-tail)]
}

export function buildUnifiedDiff(before: string, after: string, path: string, maxLines = 24) {
  const beforeLines = before.split("\n")
  const afterLines = after.split("\n")
  const diffLines: string[] = []

  const max = Math.max(beforeLines.length, afterLines.length)
  for (let index = 0; index < max; index += 1) {
    const left = beforeLines[index]
    const right = afterLines[index]

    if (left === right) {
      continue
    }

    if (left !== undefined) {
      diffLines.push(`-${left}`)
    }
    if (right !== undefined) {
      diffLines.push(`+${right}`)
    }
  }

  const trimmed = trimPatchLines(diffLines, maxLines)
  const additions = diffLines.filter((line) => line.startsWith("+")).length
  const deletions = diffLines.filter((line) => line.startsWith("-")).length

  return {
    additions,
    deletions,
    patch: [`--- a/${path}`, `+++ b/${path}`, ...trimmed].join("\n"),
  } satisfies TextDiffStats
}
