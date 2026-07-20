import { redirect } from "next/navigation"

type TasksPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function TasksPage({ params, searchParams }: TasksPageProps) {
  const { slug } = await params
  const query = await searchParams
  const paramsString = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      paramsString.set(key, value)
    }
  }

  const suffix = paramsString.toString()
  redirect(`/projects/${slug}/tasks/board${suffix ? `?${suffix}` : ""}`)
}
