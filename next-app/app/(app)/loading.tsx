import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl md:col-span-2 xl:col-span-1" />
      </div>
      <Skeleton className="min-h-[280px] flex-1 rounded-xl" />
    </div>
  )
}
