"use server"

import { revalidatePath } from "next/cache"

import { getGithubAccessToken } from "@/lib/auth/integrations-context"
import { requireProject } from "@/lib/auth/project-context"
import {
  getGithubPullRequest,
  resolveGithubPullRequestState,
} from "@/lib/github/api"
import { parseGithubPullRequestUrl, normalizeBranchName } from "@/lib/utils/github"
import { createClient } from "@/lib/supabase/server"

export type GithubActionState = {
  error?: string
  success?: string
}

export async function linkTaskPullRequest(
  _prevState: GithubActionState,
  formData: FormData
): Promise<GithubActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const prInput = String(formData.get("prUrl") ?? "").trim()

  if (!taskId || !prInput) {
    return { error: "Pull request URL is required." }
  }

  const parsed = parseGithubPullRequestUrl(prInput)
  if (!parsed) {
    return {
      error: "Enter a valid GitHub pull request URL (e.g. https://github.com/owner/repo/pull/42).",
    }
  }

  const { project } = await requireProject(slug)
  if (
    project.github_owner &&
    project.github_repo_name &&
    (project.github_owner !== parsed.owner || project.github_repo_name !== parsed.repo)
  ) {
    return {
      error: `This project is linked to ${project.github_owner}/${project.github_repo_name}.`,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  let prTitle = `Pull request #${parsed.number}`
  let prState: "open" | "closed" | "merged" = "open"

  const accessToken = await getGithubAccessToken()
  if (accessToken) {
    const pr = await getGithubPullRequest(
      accessToken,
      parsed.owner,
      parsed.repo,
      parsed.number
    )
    if (pr) {
      prTitle = pr.title
      prState = resolveGithubPullRequestState(pr)
    }
  }

  const { error } = await supabase.from("task_github_pull_requests").insert({
    task_id: taskId,
    repo_owner: parsed.owner,
    repo_name: parsed.repo,
    pr_number: parsed.number,
    pr_url: parsed.url,
    pr_title: prTitle,
    pr_state: prState,
    linked_by: user.id,
  })

  if (error) {
    if (error.message.includes("task_github_pull_requests_task_id_repo_owner_repo_name_pr")) {
      return { error: "This pull request is already linked to the task." }
    }
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: "Pull request linked." }
}

export async function unlinkTaskPullRequest(
  linkId: string,
  slug: string
): Promise<GithubActionState> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("task_github_pull_requests")
    .delete()
    .eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: "Pull request unlinked." }
}

export async function refreshTaskPullRequest(
  linkId: string,
  slug: string
): Promise<GithubActionState> {
  const supabase = await createClient()
  const { data: link } = await supabase
    .from("task_github_pull_requests")
    .select("*")
    .eq("id", linkId)
    .maybeSingle()

  if (!link) {
    return { error: "Pull request link not found." }
  }

  const accessToken = await getGithubAccessToken()
  if (!accessToken) {
    return { error: "Connect GitHub in Settings to refresh pull request status." }
  }

  const pr = await getGithubPullRequest(
    accessToken,
    link.repo_owner,
    link.repo_name,
    link.pr_number
  )

  if (!pr) {
    return { error: "Could not load pull request from GitHub." }
  }

  const { error } = await supabase
    .from("task_github_pull_requests")
    .update({
      pr_title: pr.title,
      pr_state: resolveGithubPullRequestState(pr),
      pr_url: pr.html_url,
    })
    .eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: "Pull request updated." }
}

function resolveTaskRepo(project: {
  github_owner: string | null
  github_repo_name: string | null
}) {
  if (!project.github_owner || !project.github_repo_name) {
    return null
  }
  return {
    owner: project.github_owner,
    name: project.github_repo_name,
  }
}

export async function linkTaskBranch(
  _prevState: GithubActionState,
  formData: FormData
): Promise<GithubActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const branchInput = String(formData.get("branchName") ?? "").trim()

  if (!taskId || !branchInput) {
    return { error: "Branch name is required." }
  }

  const branchName = normalizeBranchName(branchInput)
  if (!branchName) {
    return { error: "Enter a valid branch name." }
  }

  const { project } = await requireProject(slug)
  const repo = resolveTaskRepo(project)
  if (!repo) {
    return { error: "Link a GitHub repository in project settings first." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { error } = await supabase.from("task_github_branches").insert({
    task_id: taskId,
    repo_owner: repo.owner,
    repo_name: repo.name,
    branch_name: branchName,
    linked_by: user.id,
  })

  if (error) {
    if (error.message.includes("task_github_branches_task_id_repo_owner_repo_name_branch")) {
      return { error: "This branch is already linked to the task." }
    }
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: "Branch linked." }
}

export async function unlinkTaskBranch(
  linkId: string,
  slug: string
): Promise<GithubActionState> {
  const supabase = await createClient()
  const { error } = await supabase.from("task_github_branches").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: "Branch unlinked." }
}

export async function generateProjectGithubWebhookSecret(
  _prevState: GithubActionState,
  formData: FormData
): Promise<GithubActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!projectId || !slug) {
    return { error: "Project is required." }
  }

  const { randomBytes } = await import("node:crypto")
  const secret = randomBytes(32).toString("hex")

  const supabase = await createClient()
  const { error } = await supabase
    .from("projects")
    .update({ github_webhook_secret: secret })
    .eq("id", projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/settings`)
  return { success: "Webhook secret generated." }
}
