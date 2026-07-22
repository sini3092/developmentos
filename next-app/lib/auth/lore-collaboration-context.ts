import type {
  LoreComment,
  LoreReviewRequest,
  LoreSection,
  Profile,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type LoreCommentWithAuthor = LoreComment & {
  author: Profile | null
  resolver: Profile | null
  section: Pick<LoreSection, "id" | "section_key" | "title"> | null
  replies: LoreCommentWithAuthor[]
}

export type LoreReviewRequestWithAuthor = LoreReviewRequest & {
  requester: Profile | null
  resolver: Profile | null
}

async function attachCommentAuthors(comments: LoreComment[]) {
  if (comments.length === 0) {
    return [] as Array<LoreComment & { author: Profile | null; resolver: Profile | null }>
  }

  const supabase = await createClient()
  const userIds = [
    ...new Set(
      comments.flatMap((comment) => [comment.created_by, comment.resolved_by].filter(Boolean))
    ),
  ] as string[]

  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", userIds)
      : { data: [] as Profile[] }

  return comments.map((comment) => ({
    ...comment,
    author: profiles?.find((profile) => profile.id === comment.created_by) ?? null,
    resolver: profiles?.find((profile) => profile.id === comment.resolved_by) ?? null,
  }))
}

function buildCommentTree(
  comments: Array<LoreComment & { author: Profile | null; resolver: Profile | null; section: Pick<LoreSection, "id" | "section_key" | "title"> | null }>
): LoreCommentWithAuthor[] {
  const byId = new Map<string, LoreCommentWithAuthor>()

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] })
  }

  const roots: LoreCommentWithAuthor[] = []

  for (const comment of byId.values()) {
    if (comment.parent_comment_id && byId.has(comment.parent_comment_id)) {
      byId.get(comment.parent_comment_id)!.replies.push(comment)
    } else {
      roots.push(comment)
    }
  }

  return roots
}

export async function getLoreComments(entryId: string): Promise<LoreCommentWithAuthor[]> {
  const supabase = await createClient()

  const { data: comments } = await supabase
    .from("lore_comments")
    .select("*")
    .eq("entry_id", entryId)
    .order("created_at", { ascending: true })

  if (!comments?.length) {
    return []
  }

  const sectionIds = [...new Set(comments.map((comment) => comment.section_id).filter(Boolean))] as string[]
  const { data: sections } =
    sectionIds.length > 0
      ? await supabase.from("lore_sections").select("id, section_key, title").in("id", sectionIds)
      : { data: [] as Array<Pick<LoreSection, "id" | "section_key" | "title">> }

  const withAuthors = await attachCommentAuthors(comments)
  const enriched = withAuthors.map((comment) => ({
    ...comment,
    section: sections?.find((section) => section.id === comment.section_id) ?? null,
  }))

  return buildCommentTree(enriched)
}

export async function getUnresolvedLoreCommentCount(entryId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from("lore_comments")
    .select("id", { count: "exact", head: true })
    .eq("entry_id", entryId)
    .eq("status", "open")

  return count ?? 0
}

export async function getPendingLoreReview(entryId: string): Promise<LoreReviewRequestWithAuthor | null> {
  const supabase = await createClient()

  const { data: review } = await supabase
    .from("lore_review_requests")
    .select("*")
    .eq("entry_id", entryId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!review) {
    return null
  }

  const userIds = [review.requested_by, review.resolved_by].filter(Boolean) as string[]
  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", userIds)
      : { data: [] as Profile[] }

  return {
    ...review,
    requester: profiles?.find((profile) => profile.id === review.requested_by) ?? null,
    resolver: profiles?.find((profile) => profile.id === review.resolved_by) ?? null,
  }
}

export async function getPendingLoreReviewsForEntries(entryIds: string[]) {
  if (entryIds.length === 0) {
    return {} as Record<string, LoreReviewRequestWithAuthor>
  }

  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from("lore_review_requests")
    .select("*")
    .in("entry_id", entryIds)
    .eq("status", "pending")

  if (!reviews?.length) {
    return {} as Record<string, LoreReviewRequestWithAuthor>
  }

  const userIds = [
    ...new Set(reviews.flatMap((review) => [review.requested_by, review.resolved_by].filter(Boolean))),
  ] as string[]

  const { data: profiles } =
    userIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", userIds)
      : { data: [] as Profile[] }

  const map: Record<string, LoreReviewRequestWithAuthor> = {}
  for (const review of reviews) {
    map[review.entry_id] = {
      ...review,
      requester: profiles?.find((profile) => profile.id === review.requested_by) ?? null,
      resolver: profiles?.find((profile) => profile.id === review.resolved_by) ?? null,
    }
  }

  return map
}
