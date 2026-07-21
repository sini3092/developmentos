import { NextResponse } from "next/server"

import { getTaskDetail } from "@/lib/auth/task-context"

type TaskRouteProps = {
  params: Promise<{ slug: string; taskId: string }>
}

export async function GET(_request: Request, { params }: TaskRouteProps) {
  const { slug, taskId } = await params
  const task = await getTaskDetail(taskId, slug)

  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 })
  }

  return NextResponse.json(task)
}
