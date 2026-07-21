"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

type RoadmapErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RoadmapError({ error, reset }: RoadmapErrorProps) {
  useEffect(() => {
    console.error("Roadmap page error:", error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Roadmap could not load</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Something went wrong while loading this project overview. Try again, or open the task
          board while we recover.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Reload roadmap</Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go back
        </Button>
      </div>
    </div>
  )
}
