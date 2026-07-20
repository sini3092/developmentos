import { NextResponse } from "next/server"
import { z } from "zod"

import { authenticateBridgeToken } from "@/lib/bridge/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100)
const id = z.string().uuid()
const projectSlug = z.string().trim().min(1).max(120)
const limit = z.number().int().min(1).max(100).default(50)
const taskStatus = z.enum(["backlog", "ready", "in_progress", "in_review", "blocked", "done", "cancelled"])
const taskPriority = z.enum(["none", "low", "medium", "high", "urgent"])
const health = z.enum(["no_status", "on_track", "at_risk", "off_track"])
const bodySchema = z.object({ operation: z.string().min(1), input: z.record(z.string(), z.unknown()).default({}) }).strict()

type AdminClient = ReturnType<typeof createAdminClient>
type ProjectAccess = { project: { id: string; workspace_id: string; slug: string; visibility: string }; workspaceRole: string; projectRole: string | null; canManage: boolean }

async function memberships(db: AdminClient, userId: string) {
  const { data, error } = await db.from("workspace_members").select("workspace_id, role").eq("user_id", userId)
  if (error) throw error
  return data ?? []
}

async function accessibleProjects(db: AdminClient, userId: string) {
  const ws = await memberships(db, userId)
  if (!ws.length) return []
  const { data: projects, error } = await db.from("projects").select("id, workspace_id, name, slug, description, color, status, visibility, task_prefix, created_at, updated_at").in("workspace_id", ws.map((row) => row.workspace_id)).eq("status", "active").order("updated_at", { ascending: false })
  if (error) throw error
  const { data: projectMemberships } = await db.from("project_members").select("project_id").eq("user_id", userId)
  const joined = new Set((projectMemberships ?? []).map((row) => row.project_id))
  const ownerWorkspaces = new Set(ws.filter((row) => row.role === "owner").map((row) => row.workspace_id))
  return (projects ?? []).filter((project) => project.visibility !== "private" || joined.has(project.id) || ownerWorkspaces.has(project.workspace_id))
}

async function projectAccess(db: AdminClient, userId: string, selector: { slug?: string; id?: string }): Promise<ProjectAccess> {
  let query = db.from("projects").select("id, workspace_id, slug, visibility")
  query = selector.id ? query.eq("id", selector.id) : query.eq("slug", selector.slug ?? "")
  const { data: projects, error } = await query.limit(20)
  if (error) throw error
  const workspaceRows = await memberships(db, userId)
  const workspaceRole = new Map(workspaceRows.map((row) => [row.workspace_id, row.role]))
  for (const project of projects ?? []) {
    const wsRole = workspaceRole.get(project.workspace_id)
    if (!wsRole) continue
    const { data: member } = await db.from("project_members").select("role").eq("project_id", project.id).eq("user_id", userId).maybeSingle()
    if (project.visibility === "private" && !member && wsRole !== "owner") continue
    return { project, workspaceRole: wsRole, projectRole: member?.role ?? null, canManage: wsRole === "owner" || ["owner", "project_lead"].includes(member?.role ?? "") }
  }
  throw Object.assign(new Error("Project not found or access denied."), { status: 404 })
}

async function taskAccess(db: AdminClient, userId: string, taskRef: string) {
  const column = /^[0-9a-f-]{36}$/i.test(taskRef) ? "id" : "identifier"
  const { data: task, error } = await db.from("tasks").select("*").eq(column, taskRef).is("deleted_at", null).maybeSingle()
  if (error) throw error
  if (!task) throw Object.assign(new Error("Task not found."), { status: 404 })
  const access = await projectAccess(db, userId, { id: task.project_id })
  return { task, access }
}

function ensureManage(access: ProjectAccess) {
  if (!access.canManage) throw Object.assign(new Error("Project owner or project lead permission required."), { status: 403 })
}

async function handler(operation: string, raw: Record<string, unknown>, db: AdminClient, userId: string) {
  if (operation === "projects.list") {
    return accessibleProjects(db, userId)
  }
  if (operation === "projects.get") {
    const input = z.object({ slug: projectSlug }).strict().parse(raw)
    const access = await projectAccess(db, userId, { slug: input.slug })
    const { data, error } = await db.from("projects").select("*").eq("id", access.project.id).single()
    if (error) throw error
    return data
  }
  if (operation === "projects.create") {
    const input = z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(5000).optional(), taskPrefix: z.string().trim().min(2).max(8).regex(/^[A-Za-z0-9]+$/).optional(), visibility: z.enum(["workspace", "private"]).optional() }).strict().parse(raw)
    const ws = await memberships(db, userId)
    if (ws.length !== 1) throw Object.assign(new Error("Project creation requires the token user to belong to exactly one workspace."), { status: 409 })
    const projectNameSlug = slug(input.name)
    const { data, error } = await db.rpc("create_project_with_owner", { ws_id: ws[0].workspace_id, project_name: input.name, project_slug: projectNameSlug, project_description: input.description ?? null, project_visibility: input.visibility ?? "workspace" })
    if (error) throw error
    if (input.taskPrefix) await db.from("projects").update({ task_prefix: input.taskPrefix.toUpperCase() }).eq("id", data)
    return { id: data, slug: projectNameSlug }
  }
  if (operation === "projects.update") {
    const input = z.object({ projectId: id, name: z.string().trim().min(1).max(120).optional(), description: z.string().max(5000).optional(), visibility: z.enum(["workspace", "private"]).optional() }).strict().parse(raw)
    const access = await projectAccess(db, userId, { id: input.projectId }); ensureManage(access)
    const changes = { ...(input.name && { name: input.name }), ...(input.description !== undefined && { description: input.description }), ...(input.visibility && { visibility: input.visibility }), updated_at: new Date().toISOString() }
    const { data, error } = await db.from("projects").update(changes).eq("id", input.projectId).select().single(); if (error) throw error; return data
  }

  if (operation === "roadmap.list" || operation === "milestones.list") {
    const input = z.object({ projectSlug }).strict().parse(raw); const access = await projectAccess(db, userId, { slug: input.projectSlug })
    const table = operation === "roadmap.list" ? "initiatives" : "milestones"
    const { data, error } = await db.from(table).select("*").eq("project_id", access.project.id).order("updated_at", { ascending: false }); if (error) throw error; return data ?? []
  }
  if (operation === "roadmap.create") {
    const input = z.object({ projectSlug, name: z.string().trim().min(1).max(160), summary: z.string().max(10000).optional(), status: z.enum(["idea", "planned", "active", "paused", "completed", "cancelled"]).optional(), priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(), ownerId: id.optional() }).strict().parse(raw)
    const access = await projectAccess(db, userId, { slug: input.projectSlug }); ensureManage(access)
    const { data, error } = await db.from("initiatives").insert({ workspace_id: access.project.workspace_id, project_id: access.project.id, name: input.name, slug: slug(input.name), summary: input.summary ?? null, status: input.status ?? "planned", priority: input.priority ?? "medium", owner_id: input.ownerId ?? null, created_by: userId }).select().single(); if (error) throw error; return data
  }
  if (operation === "roadmap.update") {
    const input = z.object({ initiativeId: id, name: z.string().trim().min(1).max(160).optional(), summary: z.string().max(10000).optional(), status: z.enum(["idea", "planned", "active", "paused", "completed", "cancelled"]).optional(), progress: z.number().int().min(0).max(100).optional(), health: health.optional(), ownerId: id.optional() }).strict().parse(raw)
    const { data: row } = await db.from("initiatives").select("project_id").eq("id", input.initiativeId).maybeSingle(); if (!row) throw Object.assign(new Error("Initiative not found."), { status: 404 }); const access = await projectAccess(db, userId, { id: row.project_id }); ensureManage(access)
    const { initiativeId, ownerId, ...changes } = input; const { data, error } = await db.from("initiatives").update({ ...changes, ...(ownerId && { owner_id: ownerId }), updated_at: new Date().toISOString() }).eq("id", initiativeId).select().single(); if (error) throw error; return data
  }
  if (operation === "milestones.create") {
    const input = z.object({ projectSlug, name: z.string().trim().min(1).max(160), description: z.string().max(10000).optional(), targetDate: z.iso.date().optional(), initiativeId: id.optional(), ownerId: id.optional() }).strict().parse(raw)
    const access = await projectAccess(db, userId, { slug: input.projectSlug }); ensureManage(access)
    const { data, error } = await db.from("milestones").insert({ workspace_id: access.project.workspace_id, project_id: access.project.id, name: input.name, slug: slug(input.name), description: input.description ?? null, target_date: input.targetDate ?? null, initiative_id: input.initiativeId ?? null, owner_id: input.ownerId ?? null, created_by: userId }).select().single(); if (error) throw error; return data
  }
  if (operation === "milestones.update") {
    const input = z.object({ milestoneId: id, name: z.string().trim().min(1).max(160).optional(), description: z.string().max(10000).optional(), status: z.enum(["draft", "planned", "active", "completed", "missed", "cancelled"]).optional(), progress: z.number().int().min(0).max(100).optional(), health: health.optional(), targetDate: z.iso.date().optional() }).strict().parse(raw)
    const { data: row } = await db.from("milestones").select("project_id").eq("id", input.milestoneId).maybeSingle(); if (!row) throw Object.assign(new Error("Milestone not found."), { status: 404 }); const access = await projectAccess(db, userId, { id: row.project_id }); ensureManage(access)
    const { milestoneId, targetDate, ...changes } = input; const { data, error } = await db.from("milestones").update({ ...changes, ...(targetDate && { target_date: targetDate }), updated_at: new Date().toISOString() }).eq("id", milestoneId).select().single(); if (error) throw error; return data
  }

  if (operation === "tasks.list" || operation === "assignments.list") {
    const input = z.object({ projectSlug, status: taskStatus.optional(), assigneeId: z.string().optional(), query: z.string().max(200).optional(), limit: limit.optional() }).strict().parse(raw)
    const access = await projectAccess(db, userId, { slug: input.projectSlug }); let query = db.from("tasks").select("*").eq("project_id", access.project.id).is("deleted_at", null).order("updated_at", { ascending: false }).limit(input.limit ?? 50)
    if (input.status) query = query.eq("status", input.status); if (input.assigneeId === "unassigned") query = query.is("assignee_id", null); else if (input.assigneeId) query = query.eq("assignee_id", input.assigneeId); if (input.query) query = query.or(`title.ilike.%${input.query.replace(/[%_,()]/g, "")}%,identifier.ilike.%${input.query.replace(/[%_,()]/g, "")}%`)
    const { data, error } = await query; if (error) throw error; return data ?? []
  }
  if (operation === "tasks.get") { const input = z.object({ task: z.string().min(1).max(100) }).strict().parse(raw); return (await taskAccess(db, userId, input.task)).task }
  if (operation === "tasks.create") {
    const input = z.object({ projectSlug, title: z.string().trim().min(1).max(300), description: z.string().max(30000).optional(), status: taskStatus.optional(), priority: taskPriority.optional(), assigneeId: id.optional(), milestoneId: id.optional(), initiativeId: id.optional(), dueDate: z.iso.date().optional(), estimateHours: z.number().int().min(0).max(10000).optional() }).strict().parse(raw)
    const access = await projectAccess(db, userId, { slug: input.projectSlug }); const { data, error } = await db.rpc("create_task", { p_project_id: access.project.id, p_title: input.title, p_description: input.description ?? null, p_status: input.status ?? "backlog", p_priority: input.priority ?? "none", p_assignee_id: input.assigneeId ?? null, p_due_date: input.dueDate ?? null }); if (error) throw error
    if (input.milestoneId || input.initiativeId || input.estimateHours !== undefined) await db.from("tasks").update({ milestone_id: input.milestoneId, initiative_id: input.initiativeId, estimate_hours: input.estimateHours }).eq("id", data.id)
    return data
  }
  if (operation === "tasks.update") {
    const input = z.object({ taskId: id, title: z.string().trim().min(1).max(300).optional(), description: z.string().max(30000).optional(), status: taskStatus.optional(), priority: taskPriority.optional(), assigneeId: id.nullable().optional(), milestoneId: id.nullable().optional(), initiativeId: id.nullable().optional(), dueDate: z.iso.date().nullable().optional(), progress: z.number().int().min(0).max(100).optional() }).strict().parse(raw); await taskAccess(db, userId, input.taskId)
    const { taskId, assigneeId, milestoneId, initiativeId, dueDate, ...changes } = input; const patch = { ...changes, ...(assigneeId !== undefined && { assignee_id: assigneeId }), ...(milestoneId !== undefined && { milestone_id: milestoneId }), ...(initiativeId !== undefined && { initiative_id: initiativeId }), ...(dueDate !== undefined && { due_date: dueDate }), updated_at: new Date().toISOString() }; const { data, error } = await db.from("tasks").update(patch).eq("id", taskId).select().single(); if (error) throw error; return data
  }
  if (operation === "tasks.comment") { const input = z.object({ taskId: id, body: z.string().trim().min(1).max(20000) }).strict().parse(raw); await taskAccess(db, userId, input.taskId); const { data, error } = await db.from("task_comments").insert({ task_id: input.taskId, author_id: userId, body: input.body }).select().single(); if (error) throw error; return data }
  if (operation === "assignments.delegate") { const input = z.object({ taskId: id, assigneeId: id, note: z.string().max(5000).optional() }).strict().parse(raw); const { access } = await taskAccess(db, userId, input.taskId); const { data: member } = await db.from("project_members").select("id").eq("project_id", access.project.id).eq("user_id", input.assigneeId).maybeSingle(); if (!member) throw Object.assign(new Error("Assignee is not a project member."), { status: 422 }); const { data, error } = await db.from("tasks").update({ assignee_id: input.assigneeId, updated_at: new Date().toISOString() }).eq("id", input.taskId).select().single(); if (error) throw error; if (input.note) await db.from("task_comments").insert({ task_id: input.taskId, author_id: userId, body: input.note }); return data }

  if (operation === "team.list") {
    const input = z.object({ projectSlug: projectSlug.optional() }).strict().parse(raw); let workspaceId: string; let memberProjectId: string | null = null
    if (input.projectSlug) { const access = await projectAccess(db, userId, { slug: input.projectSlug }); workspaceId = access.project.workspace_id; memberProjectId = access.project.id } else { const ws = await memberships(db, userId); if (ws.length !== 1) throw Object.assign(new Error("Specify projectSlug when the user belongs to multiple workspaces."), { status: 409 }); workspaceId = ws[0].workspace_id }
    const { data: wm, error } = await db.from("workspace_members").select("user_id, role, joined_at").eq("workspace_id", workspaceId); if (error) throw error; const ids = (wm ?? []).map((row) => row.user_id); const [{ data: profiles }, { data: pm }] = await Promise.all([ids.length ? db.from("profiles").select("id, display_name, avatar_url").in("id", ids) : Promise.resolve({ data: [] }), memberProjectId ? db.from("project_members").select("user_id, role").eq("project_id", memberProjectId) : Promise.resolve({ data: [] })]); return (wm ?? []).map((row) => ({ ...row, profile: profiles?.find((p) => p.id === row.user_id) ?? null, projectRole: pm?.find((p) => p.user_id === row.user_id)?.role ?? null }))
  }
  if (operation === "team.setRole") { const input = z.object({ projectSlug, userId: id, role: z.enum(["owner", "project_lead", "team_member", "viewer"]) }).strict().parse(raw); const access = await projectAccess(db, userId, { slug: input.projectSlug }); ensureManage(access); const { data, error } = await db.from("project_members").upsert({ project_id: access.project.id, user_id: input.userId, role: input.role }, { onConflict: "project_id,user_id" }).select().single(); if (error) throw error; return data }

  if (["design.list", "lore.list"].includes(operation)) { const input = z.object({ projectSlug }).strict().parse(raw); const access = await projectAccess(db, userId, { slug: input.projectSlug }); const table = operation === "design.list" ? "design_documents" : "lore_entries"; const { data, error } = await db.from(table).select("*").eq("project_id", access.project.id).order("updated_at", { ascending: false }); if (error) throw error; return data ?? [] }
  if (operation === "design.upsert") { const input = z.object({ projectSlug, documentId: id.optional(), title: z.string().trim().min(1).max(200), category: z.string().max(80).optional(), summary: z.string().max(5000).optional(), content: z.string().max(100000).optional(), status: z.enum(["draft", "in_review", "approved", "deprecated", "archived"]).optional() }).strict().parse(raw); const access = await projectAccess(db, userId, { slug: input.projectSlug }); const values = { workspace_id: access.project.workspace_id, project_id: access.project.id, title: input.title, slug: slug(input.title), category: input.category ?? "game-design", summary: input.summary ?? null, content: input.content ?? "", status: input.status ?? "draft", author_id: userId, created_by: userId, updated_at: new Date().toISOString() }; const query = input.documentId ? db.from("design_documents").update(values).eq("id", input.documentId).eq("project_id", access.project.id) : db.from("design_documents").insert(values); const { data, error } = await query.select().single(); if (error) throw error; return data }
  if (operation === "lore.upsert") { const input = z.object({ projectSlug, entryId: id.optional(), name: z.string().trim().min(1).max(200), entryType: z.enum(["character", "faction", "location", "region", "settlement", "creature", "enemy", "deity", "historical_event", "culture", "religion", "item", "weapon", "artifact", "resource", "quest", "story_arc", "dialogue", "book_or_note", "magic_system", "language", "timeline_event", "other"]).optional(), summary: z.string().max(5000).optional(), content: z.string().max(100000).optional(), canonStatus: z.enum(["concept", "draft", "review", "canon", "retconned", "archived"]).optional() }).strict().parse(raw); const access = await projectAccess(db, userId, { slug: input.projectSlug }); const values = { workspace_id: access.project.workspace_id, project_id: access.project.id, name: input.name, slug: slug(input.name), entry_type: input.entryType ?? "other", summary: input.summary ?? null, content: input.content ?? "", canon_status: input.canonStatus ?? "draft", author_id: userId, created_by: userId, updated_at: new Date().toISOString() }; const query = input.entryId ? db.from("lore_entries").update(values).eq("id", input.entryId).eq("project_id", access.project.id) : db.from("lore_entries").insert(values); const { data, error } = await query.select().single(); if (error) throw error; return data }

  if (operation === "activity.list") { const input = z.object({ projectSlug: projectSlug.optional(), limit: limit.optional() }).strict().parse(raw); let query = db.from("activity_events").select("*").order("created_at", { ascending: false }).limit(input.limit ?? 50); if (input.projectSlug) { const access = await projectAccess(db, userId, { slug: input.projectSlug }); query = query.eq("project_id", access.project.id) } else { const projects = await accessibleProjects(db, userId); query = query.in("project_id", projects.map((project) => project.id)) } const { data, error } = await query; if (error) throw error; return data ?? [] }
  if (operation === "analytics.get") { const input = z.object({ projectSlug: projectSlug.optional() }).strict().parse(raw); let taskQuery = db.from("tasks").select("status, due_date").is("deleted_at", null); if (input.projectSlug) { const access = await projectAccess(db, userId, { slug: input.projectSlug }); taskQuery = taskQuery.eq("project_id", access.project.id) } else { const projects = await accessibleProjects(db, userId); taskQuery = taskQuery.in("project_id", projects.map((project) => project.id)) } const { data, error } = await taskQuery; if (error) throw error; const tasks = data ?? []; const counts = Object.fromEntries(taskStatus.options.map((state) => [state, tasks.filter((task) => task.status === state).length])); const done = counts.done ?? 0; return { totalTasks: tasks.length, completionRate: tasks.length ? Math.round(done / tasks.length * 100) : 0, tasksByStatus: counts, overdueTasks: tasks.filter((task) => task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && !["done", "cancelled"].includes(task.status)).length } }
  if (operation === "search") {
    const input = z.object({ query: z.string().trim().min(2).max(200), projectSlug: projectSlug.optional(), type: z.enum(["all", "project", "task", "initiative", "milestone", "design_document", "lore_entry"]).optional(), limit: limit.optional() }).strict().parse(raw); const visibleProjects = await accessibleProjects(db, userId); const q = input.query.replace(/[%_,()]/g, ""); let projectId: string | undefined; if (input.projectSlug) projectId = (await projectAccess(db, userId, { slug: input.projectSlug })).project.id; const visibleProjectIds = projectId ? [projectId] : visibleProjects.map((project) => project.id); const max = input.limit ?? 50; const results: Array<{ type: string; item: unknown }> = []
    const specs = [{ type: "project", table: "projects", fields: "name,description", project: false }, { type: "task", table: "tasks", fields: "title,identifier", project: true }, { type: "initiative", table: "initiatives", fields: "name,summary", project: true }, { type: "milestone", table: "milestones", fields: "name,description", project: true }, { type: "design_document", table: "design_documents", fields: "title,summary", project: true }, { type: "lore_entry", table: "lore_entries", fields: "name,summary", project: true }] as const
    for (const spec of specs) { if (input.type && input.type !== "all" && input.type !== spec.type) continue; const filter = spec.fields.split(",").map((field) => `${field}.ilike.%${q}%`).join(","); if (spec.table === "projects") { const { data } = await db.from("projects").select("*").or(filter).in("id", visibleProjectIds).limit(max); for (const item of data ?? []) results.push({ type: spec.type, item }) } else { const table = spec.table; const { data } = await db.from(table).select("*").or(filter).in("project_id", visibleProjectIds).limit(max); for (const item of data ?? []) results.push({ type: spec.type, item }) } }
    return results.slice(0, max)
  }
  throw Object.assign(new Error(`Unknown operation: ${operation}`), { status: 404 })
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateBridgeToken(request)
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: 401 })
    const { operation, input } = bodySchema.parse(await request.json())
    const data = await handler(operation, input, createAdminClient(), auth.userId)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid MCP input.", details: error.flatten() }, { status: 400 })
    const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500
    const message = error instanceof Error ? error.message : "Unexpected DevelopmentOS MCP error."
    if (status >= 500) console.error("DevelopmentOS MCP API error", error)
    return NextResponse.json({ error: message }, { status })
  }
}
