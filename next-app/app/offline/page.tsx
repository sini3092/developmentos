import Link from "next/link"
import { WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <WifiOff className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        DevelopmentOS can show cached pages while offline. Reconnect to sync the latest
        tasks, roadmap updates, and team activity.
      </p>
      <Button asChild>
        <Link href="/">Return home</Link>
      </Button>
    </div>
  )
}
