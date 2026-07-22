import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LoreChangeSummaryFieldProps = {
  defaultValue?: string | null
  required?: boolean
  hint?: string
}

export function LoreChangeSummaryField({
  defaultValue = "",
  required = false,
  hint = "Briefly describe what changed — required for canon entries.",
}: LoreChangeSummaryFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="changeSummary">Change summary</Label>
      <Textarea
        id="changeSummary"
        name="changeSummary"
        rows={2}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder="Expanded background and linked to the Battle of Hollowmere…"
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
