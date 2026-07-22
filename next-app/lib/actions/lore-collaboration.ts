"use server"

import { revalidatePath } from "next/cache"

import type { LoreCommentStatus } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { resolveMentionedUserIds } from "@/lib/utils/mentions"

export type LoreCollaborationActionState = {
  error?: string
  success?: string
}

function revalidateLoreEntryPaths(slug: string, entrySlug: string) {
  revalidatePath(`/projects/${slug}/lore`)
  revalidatePath(`/projects/${slug}/lore/review`)
  revalidatePath(`/projects/${slug}/lore/drafts`)
  revalidatePath(`/projects/${slug}/lore/${entrySlug}`)
  revalidatePath(`/projects/${slug}/lore/${entrySlug}/edit`)
}

async function getEntryContext(entryId: string) {
  const supabase = await createClient()
  const { data: entry } = await supabase
    .from("lore_entries")
    .select("id, name, slug, project_id, workspace_id, author_id, created_by, canon_status")
    .eq("id", entryId)
    .maybeSingle()

  return { supabase, entry }
}

async function getProjectManagers(projectId: string) {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", projectId)
    .in("role", ["owner", "project_lead"])

  return members?.map((member) => member.user_id) ?? []
}

async function getProjectMemberProfiles(projectId: string) {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)

  const userIds = members?.map((member) => member.user_id) ?? []
  if (userIds.length === 0) {
    return []
  }

  const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds)

  return (profiles ?? []).map((profile) => ({
    profile: { id: profile.id, display_name: profile.display_name },
  }))
}

async function notifyLoreMentions({
  body,
  workspaceId,
  slug,
  entrySlug,
  entryId,
  entryName,
  commentId,
  authorName,
  projectId,
}: {
  body: string
  workspaceId: string
  slug: string
  entrySlug: string
  entryId: string
  entryName: string
  commentId: string
  authorName: string
  projectId: string
}) {
  const memberProfiles = await getProjectMemberProfiles(projectId)
  const mentionedUserIds = resolveMentionedUserIds(body, memberProfiles)
  if (mentionedUserIds.length === 0) {
    return
  }

  const supabase = await createClient()
  const link = `/projects/${slug}/lore/${entrySlug}`

  await Promise.all(
    mentionedUserIds.map((userId) =>
      supabase.rpc("notify_lore_mention", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
        p_title: `${authorName} mentioned you on ${entryName}`,
        p_body: body.slice(0, 200),
        p_link: link,
        p_entry_id: entryId,
        p_comment_id: commentId,
      })
    )
  )
}

export async function addLoreComment(
  _prevState: LoreCollaborationActionState,
  formData: FormData
): Promise<LoreCollaborationActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const sectionId = String(formData.get("sectionId") ?? "")
  const parentCommentId = String(formData.get("parentCommentId") ?? "")
  const content = String(formData.get("content") ?? "").trim()

  if (!entryId || !content) {
    return { error: "Comment cannot be empty." }
  }

  const { supabase, entry } = await getEntryContext(entryId)
  if (!entry) {
    return { error: "Lore entry not found." }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: comment, error } = await supabase
    .from("lore_comments")
    .insert({
      entry_id: entryId,
      section_id: sectionId || null,
      parent_comment_id: parentCommentId || null,
      content,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()

  await notifyLoreMentions({
    body: content,
    workspaceId: entry.workspace_id,
    slug,
    entrySlug,
    entryId,
    entryName: entry.name,
    commentId: comment.id,
    authorName: profile?.display_name ?? "Someone",
    projectId: entry.project_id,
  })

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Comment added." }
}

export async function updateLoreCommentStatus(
  _prevState: LoreCollaborationActionState,
  formData: FormData
): Promise<LoreCollaborationActionState> {
  const commentId = String(formData.get("commentId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const status = String(formData.get("status") ?? "open") as LoreCommentStatus

  if (!commentId) {
    return { error: "Missing comment." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const resolvedAt = status === "resolved" ? new Date().toISOString() : null
  const resolvedBy = status === "resolved" ? (user?.id ?? null) : null

  const { error } = await supabase
    .from("lore_comments")
    .update({
      status,
      resolved_at: resolvedAt,
      resolved_by: resolvedBy,
    })
    .eq("id", commentId)

  if (error) {
    return { error: error.message }
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: status === "resolved" ? "Comment resolved." : "Comment reopened." }
}

export async function requestLoreReview(
  _prevState: LoreCollaborationActionState,
  formData: FormData
): Promise<LoreCollaborationActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const message = String(formData.get("message") ?? "").trim()

  if (!entryId) {
    return { error: "Entry is required." }
  }

  const { supabase, entry } = await getEntryContext(entryId)
  if (!entry) {
    return { error: "Lore entry not found." }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: existingPending } = await supabase
    .from("lore_review_requests")
    .select("id")
    .eq("entry_id", entryId)
    .eq("status", "pending")
    .maybeSingle()

  if (existingPending) {
    return { error: "This entry already has a pending review request." }
  }

  const { data: review, error: reviewError } = await supabase
    .from("lore_review_requests")
    .insert({
      entry_id: entryId,
      requested_by: user.id,
      message: message || null,
    })
    .select("id")
    .single()

  if (reviewError) {
    return { error: reviewError.message }
  }

  const { error: entryError } = await supabase
    .from("lore_entries")
    .update({ canon_status: "review" })
    .eq("id", entryId)

  if (entryError) {
    return { error: entryError.message }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle()

  const managerIds = await getProjectManagers(entry.project_id)
  const link = `/projects/${slug}/lore/${entrySlug}`
  const authorName = profile?.display_name ?? "Someone"

  await Promise.all(
    managerIds
      .filter((managerId) => managerId !== user.id)
      .map((managerId) =>
        supabase.rpc("notify_lore_review_requested", {
          p_workspace_id: entry.workspace_id,
          p_user_id: managerId,
          p_title: `${authorName} requested lore review`,
          p_body: `${entry.name}${message ? `: ${message}` : ""}`.slice(0, 200),
          p_link: link,
          p_entry_id: entryId,
          p_review_id: review.id,
        })
      )
  )

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Review requested." }
}

export async function resolveLoreReview(
  _prevState: LoreCollaborationActionState,
  formData: FormData
): Promise<LoreCollaborationActionState> {
  const reviewId = String(formData.get("reviewId") ?? "")
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const decision = String(formData.get("decision") ?? "")
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim()

  if (!reviewId || !entryId || !decision) {
    return { error: "Missing review details." }
  }

  if (decision !== "approved" && decision !== "changes_requested") {
    return { error: "Invalid review decision." }
  }

  const { supabase, entry } = await getEntryContext(entryId)
  if (!entry) {
    return { error: "Lore entry not found." }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: review } = await supabase
    .from("lore_review_requests")
    .select("id, requested_by, status")
    .eq("id", reviewId)
    .eq("entry_id", entryId)
    .maybeSingle()

  if (!review || review.status !== "pending") {
    return { error: "Review request not found or already resolved." }
  }

  const nextCanonStatus = decision === "approved" ? "canon" : "draft"
  const reviewStatus = decision === "approved" ? "approved" : "changes_requested"

  const { error: reviewError } = await supabase
    .from("lore_review_requests")
    .update({
      status: reviewStatus,
      resolved_by: user.id,
      resolution_note: resolutionNote || null,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reviewId)

  if (reviewError) {
    return { error: reviewError.message }
  }

  const { error: entryError } = await supabase
    .from("lore_entries")
    .update({ canon_status: nextCanonStatus })
    .eq("id", entryId)

  if (entryError) {
    return { error: entryError.message }
  }

  if (review.requested_by !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle()

    const link = `/projects/${slug}/lore/${entrySlug}`
    const reviewerName = profile?.display_name ?? "A reviewer"
    const title =
      decision === "approved"
        ? `${reviewerName} approved ${entry.name}`
        : `${reviewerName} requested changes on ${entry.name}`

    await supabase.rpc("notify_lore_review_resolved", {
      p_workspace_id: entry.workspace_id,
      p_user_id: review.requested_by,
      p_title: title,
      p_body: (resolutionNote || entry.name).slice(0, 200),
      p_link: link,
      p_entry_id: entryId,
      p_review_id: reviewId,
    })
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return {
    success: decision === "approved" ? "Entry approved as canon." : "Changes requested — sent back to draft.",
  }
}

export async function cancelLoreReview(
  _prevState: LoreCollaborationActionState,
  formData: FormData
): Promise<LoreCollaborationActionState> {
  const reviewId = String(formData.get("reviewId") ?? "")
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")

  if (!reviewId || !entryId) {
    return { error: "Missing review." }
  }

  const { supabase } = await getEntryContext(entryId)

  const { error: reviewError } = await supabase
    .from("lore_review_requests")
    .update({
      status: "cancelled",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .eq("status", "pending")

  if (reviewError) {
    return { error: reviewError.message }
  }

  const { error: entryError } = await supabase
    .from("lore_entries")
    .update({ canon_status: "draft" })
    .eq("id", entryId)
    .eq("canon_status", "review")

  if (entryError) {
    return { error: entryError.message }
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Review request cancelled." }
}
