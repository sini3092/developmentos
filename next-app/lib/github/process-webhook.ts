import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import {
  extractBranchName,
  parseGithubRepositoryFullName,
  resolvePullRequestState,
  type GithubPullRequestPayload,
  type GithubPushPayload,
} from "@/lib/github/webhooks"

type AdminClient = SupabaseClient<Database>

type ProjectRow = {
  id: string
  workspace_id: string
  github_webhook_secret: string | null
}

export async function findProjectForGithubRepo(
  supabase: AdminClient,
  owner: string,
  name: string
): Promise<ProjectRow | null> {
  const { data } = await supabase
    .from("projects")
    .select("id, workspace_id, github_webhook_secret")
    .eq("github_owner", owner)
    .eq("github_repo_name", name)
    .eq("status", "active")
    .maybeSingle()

  return data
}

export async function recordWebhookDelivery(
  supabase: AdminClient,
  deliveryId: string,
  projectId: string,
  eventType: string
) {
  const { error } = await supabase.from("github_webhook_deliveries").insert({
    delivery_id: deliveryId,
    project_id: projectId,
    event_type: eventType,
  })

  return !error
}

export async function processGithubPushEvent(
  supabase: AdminClient,
  project: ProjectRow,
  payload: GithubPushPayload
) {
  const branchName = extractBranchName(payload.ref)
  if (!branchName) {
    return
  }

  const repo = parseGithubRepositoryFullName(payload.repository.full_name)
  if (!repo) {
    return
  }

  const latestCommit = payload.commits.at(-1)
  const commitCount = payload.commits.length
  const commits = payload.commits.slice(-20).map((commit) => ({
    id: commit.id,
    message: commit.message,
    url: commit.url,
    author: commit.author.name,
  }))

  const summaryMessage =
    commitCount === 1 && latestCommit
      ? `Pushed commit to ${branchName}: ${latestCommit.message.split("\n")[0]}`
      : `Pushed ${commitCount} commit${commitCount === 1 ? "" : "s"} to ${branchName}`

  await supabase.rpc("log_github_activity_event", {
    p_workspace_id: project.workspace_id,
    p_project_id: project.id,
    p_event_type: "github.push",
    p_entity_type: "project",
    p_entity_id: project.id,
    p_new_value: {
      branch_name: branchName,
      commit_count: commitCount,
      pusher: payload.pusher.name,
      commits,
      latest_commit: latestCommit
        ? {
            id: latestCommit.id,
            message: latestCommit.message,
            url: latestCommit.url,
            author: latestCommit.author.name,
          }
        : null,
      compare_url: payload.compare ?? null,
      repository_url: payload.repository.html_url,
      before_sha: payload.before ?? null,
      after_sha: payload.after ?? null,
      repo_owner: repo.owner,
      repo_name: repo.name,
    },
    p_message: summaryMessage,
  })

  const { data: branchLinks } = await supabase
    .from("task_github_branches")
    .select("task_id, branch_name")
    .eq("repo_owner", repo.owner)
    .eq("repo_name", repo.name)
    .eq("branch_name", branchName)

  for (const link of branchLinks ?? []) {
    const { data: task } = await supabase
      .from("tasks")
      .select("id, workspace_id, project_id, identifier")
      .eq("id", link.task_id)
      .maybeSingle()

    if (!task || task.project_id !== project.id) {
      continue
    }

    await supabase.rpc("log_github_activity_event", {
      p_workspace_id: task.workspace_id,
      p_project_id: task.project_id,
      p_event_type: "github.commit",
      p_entity_type: "task",
      p_entity_id: task.id,
      p_new_value: {
        branch_name: branchName,
        commit_count: commitCount,
        commits,
        latest_commit: latestCommit
          ? {
              id: latestCommit.id,
              message: latestCommit.message,
              url: latestCommit.url,
              author: latestCommit.author.name,
            }
          : null,
        compare_url: payload.compare ?? null,
        repository_url: payload.repository.html_url,
        before_sha: payload.before ?? null,
        after_sha: payload.after ?? null,
        repo_owner: repo.owner,
        repo_name: repo.name,
      },
      p_message:
        latestCommit && commitCount === 1
          ? `${task.identifier}: commit on ${branchName} — ${latestCommit.message.split("\n")[0]}`
          : `${task.identifier}: ${commitCount} commit${commitCount === 1 ? "" : "s"} pushed to ${branchName}`,
    })
  }
}

export async function processGithubPullRequestEvent(
  supabase: AdminClient,
  project: ProjectRow,
  payload: GithubPullRequestPayload
) {
  const repo = parseGithubRepositoryFullName(payload.repository.full_name)
  if (!repo) {
    return
  }

  const prState = resolvePullRequestState(payload.pull_request)

  const { data: links } = await supabase
    .from("task_github_pull_requests")
    .select("id, task_id, pr_number")
    .eq("repo_owner", repo.owner)
    .eq("repo_name", repo.name)
    .eq("pr_number", payload.number)

  for (const link of links ?? []) {
    await supabase
      .from("task_github_pull_requests")
      .update({
        pr_title: payload.pull_request.title,
        pr_state: prState,
        pr_url: payload.pull_request.html_url,
      })
      .eq("id", link.id)

    const { data: task } = await supabase
      .from("tasks")
      .select("id, workspace_id, project_id, identifier")
      .eq("id", link.task_id)
      .maybeSingle()

    if (!task || task.project_id !== project.id) {
      continue
    }

    await supabase.rpc("log_github_activity_event", {
      p_workspace_id: task.workspace_id,
      p_project_id: task.project_id,
      p_event_type: "github.pull_request",
      p_entity_type: "task",
      p_entity_id: task.id,
      p_new_value: {
        action: payload.action,
        pr_number: payload.number,
        pr_title: payload.pull_request.title,
        pr_state: prState,
        pr_url: payload.pull_request.html_url,
        branch_name: payload.pull_request.head.ref,
      },
      p_message: `${task.identifier}: PR #${payload.number} ${payload.action} (${prState})`,
    })
  }
}
