import { NextResponse } from "next/server"

import {
  findProjectForGithubRepo,
  processGithubPullRequestEvent,
  processGithubPushEvent,
  recordWebhookDelivery,
} from "@/lib/github/process-webhook"
import {
  parseGithubRepositoryFullName,
  verifyGithubWebhookSignature,
  type GithubPullRequestPayload,
  type GithubPushPayload,
} from "@/lib/github/webhooks"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

export const runtime = "nodejs"

function extractGithubPayloadText(rawBody: string, contentType: string) {
  if (!rawBody.trim()) {
    return { error: "Empty webhook body. Trigger a new event (push or pull request) instead of redelivering an old failed delivery." as const }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const payloadParam = new URLSearchParams(rawBody).get("payload")
    if (!payloadParam) {
      return { error: "Missing payload parameter. Set GitHub webhook content type to application/json." as const }
    }
    return { payloadText: payloadParam, signatureBody: rawBody }
  }

  return { payloadText: rawBody, signatureBody: rawBody }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      "DevelopmentOS GitHub webhook endpoint. Configure GitHub to POST push and pull_request events here with content type application/json.",
  })
}

export async function POST(request: Request) {
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ error: "Webhook processing is not configured." }, { status: 503 })
  }

  const deliveryId = request.headers.get("x-github-delivery")
  const eventType = request.headers.get("x-github-event")
  const signature = request.headers.get("x-hub-signature-256")
  const contentType = request.headers.get("content-type") ?? ""
  const rawBody = await request.text()
  const extracted = extractGithubPayloadText(rawBody, contentType)

  if ("error" in extracted) {
    return NextResponse.json({ error: extracted.error }, { status: 400 })
  }

  const { payloadText, signatureBody } = extracted

  let payload: unknown
  try {
    payload = JSON.parse(payloadText)
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid JSON payload. In GitHub webhook settings, set Content type to application/json.",
      },
      { status: 400 }
    )
  }

  if (!deliveryId || !eventType) {
    return NextResponse.json({ error: "Missing GitHub headers." }, { status: 400 })
  }

  const repositoryFullName =
    typeof payload === "object" &&
    payload !== null &&
    "repository" in payload &&
    typeof (payload as { repository?: { full_name?: string } }).repository?.full_name ===
      "string"
      ? (payload as { repository: { full_name: string } }).repository.full_name
      : null

  if (!repositoryFullName) {
    return NextResponse.json({ error: "Repository not found in payload." }, { status: 400 })
  }

  const repo = parseGithubRepositoryFullName(repositoryFullName)
  if (!repo) {
    return NextResponse.json({ error: "Invalid repository." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const project = await findProjectForGithubRepo(supabase, repo.owner, repo.name)

  if (!project?.github_webhook_secret) {
    return NextResponse.json({ error: "Project webhook is not configured." }, { status: 404 })
  }

  if (!verifyGithubWebhookSignature(signatureBody, signature, project.github_webhook_secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 })
  }

  if (eventType === "ping") {
    return NextResponse.json({ ok: true, ping: true })
  }

  const recorded = await recordWebhookDelivery(supabase, deliveryId, project.id, eventType)
  if (!recorded) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  try {
    if (eventType === "push") {
      await processGithubPushEvent(supabase, project, payload as GithubPushPayload)
    } else if (eventType === "pull_request") {
      await processGithubPullRequestEvent(
        supabase,
        project,
        payload as GithubPullRequestPayload
      )
    }
  } catch (error) {
    console.error("GitHub webhook processing failed:", error)
    return NextResponse.json({ error: "Failed to process webhook." }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
