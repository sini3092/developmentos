type SoulsFixFile = {
  path: string
  additions: number
  deletions: number
  patch: string | null
  commitUrl?: string | null
}

export function formatSoulsGithubFixMessage(input: {
  intro?: string
  summary: string
  prTitle: string
  pullRequestUrl: string | null
  pullRequestNumber: number | null
  branchName: string
  branchUrl: string
  baseBranch: string
  repoLabel: string
  files: SoulsFixFile[]
}) {
  const prLabel = input.pullRequestNumber
    ? `PR #${input.pullRequestNumber}`
    : "Pull request"
  const prLink = input.pullRequestUrl
    ? `[${prLabel}](${input.pullRequestUrl})`
    : prLabel

  const fileLines = input.files.map((file) => {
    const stats = `+${file.additions} −${file.deletions}`
    const commit = file.commitUrl ? ` · [commit](${file.commitUrl})` : ""
    return `- \`${file.path}\` (${stats})${commit}`
  })

  const diffBlocks = input.files
    .filter((file) => file.patch?.trim())
    .map((file) => `### \`${file.path}\`\n\n\`\`\`diff\n${file.patch}\n\`\`\``)
    .join("\n\n")

  return [
    input.intro?.trim(),
    "## GitHub-endring klar for review",
    "",
    input.summary.trim(),
    "",
    `**${input.repoLabel}** · ${prLink} → \`${input.baseBranch}\``,
    `**Branch:** [\`${input.branchName}\`](${input.branchUrl})`,
    "",
    "### Filer",
    ...fileLines,
    diffBlocks ? `\n### Diff\n\n${diffBlocks}` : "",
    input.pullRequestUrl
      ? `\n[Review and merge on GitHub →](${input.pullRequestUrl})`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export function formatSoulsGithubFixDeclined(message: string) {
  return ["## Kunne ikke auto-fikse på GitHub", "", message.trim()].join("\n")
}
