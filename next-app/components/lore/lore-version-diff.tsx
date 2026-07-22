import type { LoreVersionComparison } from "@/lib/lore/version-compare"
import { Badge } from "@/components/ui/badge"

type LoreVersionDiffProps = {
  comparison: LoreVersionComparison
  title?: string
}

function DiffBlock({ patch, label }: { patch: string; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed">
        {patch.split("\n").map((line, index) => (
          <div
            key={index}
            className={
              line.startsWith("+")
                ? "text-success"
                : line.startsWith("-")
                  ? "text-danger"
                  : line.startsWith("…")
                    ? "text-muted-foreground"
                    : ""
            }
          >
            {line}
          </div>
        ))}
      </pre>
    </div>
  )
}

export function LoreVersionDiff({ comparison, title = "Changes" }: LoreVersionDiffProps) {
  const { fieldChanges, summaryDiff, contentDiff } = comparison
  const hasContentChanges = contentDiff.additions > 0 || contentDiff.deletions > 0

  if (fieldChanges.length === 0 && !hasContentChanges) {
    return (
      <p className="rounded-lg border border-border/60 bg-card px-4 py-3 text-sm text-muted-foreground">
        No differences found between these versions.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {hasContentChanges ? (
          <>
            <Badge variant="outline" className="text-success">
              +{contentDiff.additions}
            </Badge>
            <Badge variant="outline" className="text-danger">
              -{contentDiff.deletions}
            </Badge>
          </>
        ) : null}
      </div>

      {fieldChanges.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Before</th>
                <th className="px-3 py-2 font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {fieldChanges.map((change) => (
                <tr key={change.field} className="border-t border-border/40">
                  <td className="px-3 py-2 font-medium">{change.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">{change.before}</td>
                  <td className="px-3 py-2">{change.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {summaryDiff ? <DiffBlock patch={summaryDiff.patch} label="Summary diff" /> : null}
      {hasContentChanges ? <DiffBlock patch={contentDiff.patch} label="Content diff" /> : null}
    </div>
  )
}
