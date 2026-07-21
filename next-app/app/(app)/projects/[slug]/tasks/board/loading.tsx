import { Skeleton } from "@/components/ui/skeleton"

export default function TaskBoardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[28rem] flex-col rounded-xl border border-border/60 bg-surface-raised/40 p-3"
          >
            <Skeleton className="mb-3 h-5 w-2/3" />
            <div className="space-y-2">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
