import type { SupabaseClient } from "@supabase/supabase-js"

import type { BoardKey } from "@/lib/constants/board-keys"
import { EVERWOOD_BOARD_LISTS } from "@/lib/constants/board-keys"
import {
  buildEverwoodPlanCards,
  EVERWOOD_DECISIONS,
  EVERWOOD_DESIGN_DOCS,
  EVERWOOD_LORE_ENTRIES,
  EVERWOOD_MILESTONES,
  type PlanTaskCard,
} from "@/lib/imports/everwood-plan-data"
import { findTaskByTitle, loadProjectTaskTitleIndex, normalizeTaskTitle } from "@/lib/imports/task-dedup"
import type { Database, TaskPriority } from "@/lib/database.types"
import { slugify } from "@/lib/utils/format"

type Client = SupabaseClient<Database>

export type BoardPlanImportResult = {
  listsCreated: number
  listsReused: number
  tasksCreated: number
  tasksUpdated: number
  tasksSkipped: number
  checklistsAdded: number
  milestonesCreated: number
  decisionsCreated: number
  designDocsCreated: number
  loreEntriesCreated: number
  errors: string[]
}

type ListMap = Map<string, string>

function listKey(boardKey: BoardKey, listName: string) {
  return `${boardKey}::${listName.toLowerCase()}`
}

function buildTaskDescription(card: PlanTaskCard) {
  const lines: string[] = []
  if (card.system) lines.push(`**System:** ${card.system}`)
  if (card.milestone) lines.push(`**Milestone:** ${card.milestone}`)
  if (card.featureState) lines.push(`**Feature state:** ${card.featureState}`)
  if (card.description) lines.push("", card.description)
  if (card.acceptanceCriteria) {
    lines.push("", "**Acceptance criteria**", "", card.acceptanceCriteria)
  }
  return lines.join("\n").trim() || null
}

async function ensureBoardLists(
  supabase: Client,
  projectId: string,
  boardKeys: BoardKey[] = ["dev", "systems", "roadmap", "bugs", "lore"]
) {
  const result: ListMap = new Map()
  let listsCreated = 0
  let listsReused = 0

  const { data: existingLists } = await supabase
    .from("board_lists")
    .select("id, name, board_key")
    .eq("project_id", projectId)

  for (const existing of existingLists ?? []) {
    if (existing.board_key) {
      result.set(listKey(existing.board_key as BoardKey, existing.name), existing.id)
    }
  }

  for (const existing of existingLists ?? []) {
    if (existing.board_key) {
      continue
    }
    for (const boardKey of boardKeys) {
      if (EVERWOOD_BOARD_LISTS[boardKey].includes(existing.name)) {
        const key = listKey(boardKey, existing.name)
        if (!result.has(key)) {
          await supabase
            .from("board_lists")
            .update({ board_key: boardKey })
            .eq("id", existing.id)
          result.set(key, existing.id)
        }
      }
    }
  }

  let position = (existingLists?.length ?? 0) * 1000

  for (const boardKey of boardKeys) {
    for (const listName of EVERWOOD_BOARD_LISTS[boardKey]) {
      const key = listKey(boardKey, listName)
      if (result.has(key)) {
        listsReused += 1
        continue
      }

      position += 1000
      const { data, error } = await supabase
        .from("board_lists")
        .insert({
          project_id: projectId,
          name: listName,
          board_key: boardKey,
          position,
          color: "slate",
        })
        .select("id")
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? `Could not create list ${listName}`)
      }

      result.set(key, data.id)
      listsCreated += 1
    }
  }

  return { listMap: result, listsCreated, listsReused }
}

async function ensureMilestones(
  supabase: Client,
  workspaceId: string,
  projectId: string,
  userId: string
) {
  let milestonesCreated = 0
  const milestoneMap = new Map<string, string>()

  for (const milestone of EVERWOOD_MILESTONES) {
    const { data: existing } = await supabase
      .from("milestones")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", milestone.slug)
      .maybeSingle()

    if (existing) {
      milestoneMap.set(milestone.name, existing.id)
      continue
    }

    const description = [
      milestone.description,
      "",
      "**Exit criteria**",
      milestone.exitCriteria,
      "",
      "**Required cards**",
      ...milestone.checklist.map((item) => `- ${item}`),
    ].join("\n")

    const { data, error } = await supabase
      .from("milestones")
      .insert({
        workspace_id: workspaceId,
        project_id: projectId,
        name: milestone.name,
        slug: milestone.slug,
        description,
        status: "active",
        health: "on_track",
        created_by: userId,
      })
      .select("id")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? `Could not create milestone ${milestone.name}`)
    }

    milestoneMap.set(milestone.name, data.id)
    milestonesCreated += 1
  }

  return { milestoneMap, milestonesCreated }
}

async function ensureDecisions(
  supabase: Client,
  workspaceId: string,
  projectId: string,
  userId: string
) {
  let decisionsCreated = 0

  for (const decision of EVERWOOD_DECISIONS) {
    const { data: existing } = await supabase
      .from("decisions")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", decision.slug)
      .maybeSingle()

    if (existing) {
      continue
    }

    const { error } = await supabase.from("decisions").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title: decision.title,
      slug: decision.slug,
      status: "proposed",
      context: decision.context,
      problem: decision.problem,
      options: decision.options ?? undefined,
      created_by: userId,
    })

    if (error) {
      throw new Error(error.message)
    }

    decisionsCreated += 1
  }

  return decisionsCreated
}

async function ensureDesignDocs(
  supabase: Client,
  workspaceId: string,
  projectId: string,
  userId: string
) {
  let designDocsCreated = 0

  for (const doc of EVERWOOD_DESIGN_DOCS) {
    const slug = slugify(doc.title)
    const { data: existing } = await supabase
      .from("design_documents")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", slug)
      .maybeSingle()

    if (existing) {
      continue
    }

    const { error } = await supabase.from("design_documents").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      title: doc.title,
      slug,
      category: doc.category,
      summary: doc.summary,
      content: doc.summary,
      status: doc.status,
      author_id: userId,
      created_by: userId,
    })

    if (error) {
      throw new Error(error.message)
    }

    designDocsCreated += 1
  }

  return designDocsCreated
}

async function ensureLoreEntries(
  supabase: Client,
  workspaceId: string,
  projectId: string,
  userId: string
) {
  let loreEntriesCreated = 0

  for (const entry of EVERWOOD_LORE_ENTRIES) {
    const { data: existing } = await supabase
      .from("lore_entries")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", entry.slug)
      .maybeSingle()

    if (existing) {
      continue
    }

    const { error } = await supabase.from("lore_entries").insert({
      workspace_id: workspaceId,
      project_id: projectId,
      name: entry.name,
      slug: entry.slug,
      entry_type: entry.entryType as Database["public"]["Enums"]["lore_entry_type"],
      summary: entry.summary ?? `Imported from Everwood board plan (${entry.collection ?? "general"}).`,
      content: entry.summary ?? "",
      canon_status: "draft",
      created_by: userId,
    })

    if (error) {
      throw new Error(error.message)
    }

    loreEntriesCreated += 1
  }

  return loreEntriesCreated
}

async function upsertChecklistItems(
  supabase: Client,
  taskId: string,
  items: string[]
) {
  let added = 0
  const { data: existing } = await supabase
    .from("task_checklist_items")
    .select("title")
    .eq("task_id", taskId)

  const existingTitles = new Set(
    (existing ?? []).map((item) => item.title.trim().toLowerCase())
  )

  let position = existing?.length ?? 0
  for (const title of items) {
    const trimmed = title.trim()
    if (!trimmed || existingTitles.has(trimmed.toLowerCase())) {
      continue
    }

    const { error } = await supabase.from("task_checklist_items").insert({
      task_id: taskId,
      title: trimmed,
      position,
      completed: false,
    })

    if (!error) {
      added += 1
      position += 1
      existingTitles.add(trimmed.toLowerCase())
    }
  }

  return added
}

async function upsertPlanTask(
  supabase: Client,
  input: {
    projectId: string
    workspaceId: string
    card: PlanTaskCard
    listMap: ListMap
    milestoneMap: Map<string, string>
    titleIndex: Map<string, { id: string; list_id: string | null }>
  }
) {
  const listId = input.listMap.get(listKey(input.card.boardKey, input.card.listName))
  if (!listId) {
    throw new Error(`Missing list ${input.card.boardKey}/${input.card.listName}`)
  }

  const existing = await findTaskByTitle(supabase, input.projectId, input.card.title, {
    boardKey: input.card.boardKey,
  })

  const fallbackId = input.titleIndex.get(normalizeTaskTitle(input.card.title))?.id

  const description = buildTaskDescription(input.card)
  const milestoneId = input.card.milestone
    ? input.milestoneMap.get(input.card.milestone) ?? null
    : null

  if (existing || fallbackId) {
    const taskId = existing?.id ?? fallbackId!
    const patch: Database["public"]["Tables"]["tasks"]["Update"] = {
      updated_at: new Date().toISOString(),
    }

    if (description) patch.description = description
    if (input.card.priority) patch.priority = input.card.priority
    if (input.card.status) patch.status = input.card.status
    if (milestoneId) patch.milestone_id = milestoneId
    if (listId) patch.list_id = listId

    const { error } = await supabase.from("tasks").update(patch).eq("id", taskId)
    if (error) {
      throw new Error(error.message)
    }

    const checklistsAdded = input.card.checklist?.length
      ? await upsertChecklistItems(supabase, taskId, input.card.checklist)
      : 0

    return { created: false, updated: true, taskId, checklistsAdded }
  }

  const { data: task, error } = await supabase.rpc("create_task", {
    p_project_id: input.projectId,
    p_title: input.card.title,
    p_description: description,
    p_status: input.card.status ?? "backlog",
    p_priority: input.card.priority ?? "medium",
    p_assignee_id: null,
    p_discipline: "worldbuilding",
    p_due_date: null,
    p_list_id: listId,
  })

  if (error || !task) {
    throw new Error(error?.message ?? `Could not create task ${input.card.title}`)
  }

  if (milestoneId) {
    await supabase.from("tasks").update({ milestone_id: milestoneId }).eq("id", task.id)
  }

  const checklistsAdded = input.card.checklist?.length
    ? await upsertChecklistItems(supabase, task.id, input.card.checklist)
    : 0

  return { created: true, updated: false, taskId: task.id, checklistsAdded }
}

export async function importEverwoodBoardPlan(input: {
  supabase: Client
  projectId: string
  workspaceId: string
  userId: string
  cards?: PlanTaskCard[]
}) {
  const result: BoardPlanImportResult = {
    listsCreated: 0,
    listsReused: 0,
    tasksCreated: 0,
    tasksUpdated: 0,
    tasksSkipped: 0,
    checklistsAdded: 0,
    milestonesCreated: 0,
    decisionsCreated: 0,
    designDocsCreated: 0,
    loreEntriesCreated: 0,
    errors: [],
  }

  const { listMap, listsCreated, listsReused } = await ensureBoardLists(
    input.supabase,
    input.projectId
  )
  result.listsCreated = listsCreated
  result.listsReused = listsReused

  const { milestoneMap, milestonesCreated } = await ensureMilestones(
    input.supabase,
    input.workspaceId,
    input.projectId,
    input.userId
  )
  result.milestonesCreated = milestonesCreated

  result.decisionsCreated = await ensureDecisions(
    input.supabase,
    input.workspaceId,
    input.projectId,
    input.userId
  )
  result.designDocsCreated = await ensureDesignDocs(
    input.supabase,
    input.workspaceId,
    input.projectId,
    input.userId
  )
  result.loreEntriesCreated = await ensureLoreEntries(
    input.supabase,
    input.workspaceId,
    input.projectId,
    input.userId
  )

  const cards = input.cards ?? buildEverwoodPlanCards()
  const titleIndex = await loadProjectTaskTitleIndex(input.supabase, input.projectId)

  for (const card of cards) {
    try {
      const upsert = await upsertPlanTask(input.supabase, {
        projectId: input.projectId,
        workspaceId: input.workspaceId,
        card,
        listMap,
        milestoneMap,
        titleIndex,
      })

      if (upsert.created) result.tasksCreated += 1
      if (upsert.updated) result.tasksUpdated += 1
      result.checklistsAdded += upsert.checklistsAdded
    } catch (error) {
      result.errors.push(
        `${card.title}: ${error instanceof Error ? error.message : "Import failed"}`
      )
      result.tasksSkipped += 1
    }
  }

  return result
}

export async function upsertPlanTaskCard(
  supabase: Client,
  input: {
    projectId: string
    workspaceId: string
    userId: string
    card: PlanTaskCard
  }
) {
  const { listMap } = await ensureBoardLists(supabase, input.projectId, [input.card.boardKey])
  const { milestoneMap } = await ensureMilestones(
    supabase,
    input.workspaceId,
    input.projectId,
    input.userId
  )
  const titleIndex = await loadProjectTaskTitleIndex(supabase, input.projectId)

  return upsertPlanTask(supabase, {
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    card: input.card,
    listMap,
    milestoneMap,
    titleIndex,
  })
}
