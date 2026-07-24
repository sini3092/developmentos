"use client"

import { useState, useTransition } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { importEverwoodPlanForProject } from "@/lib/actions/board-plan"

type ImportEverwoodPlanButtonProps = {
  projectSlug: string
  canEdit: boolean
}

export function ImportEverwoodPlanButton({
  projectSlug,
  canEdit,
}: ImportEverwoodPlanButtonProps) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!canEdit) {
    return null
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setMessage(null)
          setError(null)
          startTransition(async () => {
            const result = await importEverwoodPlanForProject(projectSlug)
            if (result.error) {
              setError(result.error)
              return
            }
            setMessage(result.summary ?? result.success ?? "Imported.")
          })
        }}
      >
        <Download className="size-4" />
        {pending ? "Importing Everwood plan…" : "Import Everwood plan"}
      </Button>
      {message ? <p className="max-w-md text-right text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p className="max-w-md text-right text-xs text-danger">{error}</p> : null}
    </div>
  )
}
