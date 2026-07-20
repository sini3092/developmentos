"use server"

import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/zip",
])

export type AttachmentActionState = {
  error?: string
  success?: string
}

export async function uploadTaskAttachment(
  _prevState: AttachmentActionState,
  formData: FormData
): Promise<AttachmentActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const file = formData.get("file")

  if (!taskId || !(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Files must be 10 MB or smaller." }
  }

  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return { error: "File type is not supported." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const safeName = file.name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120)
  const filePath = `${taskId}/${randomUUID()}-${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from("task-attachments")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { error: insertError } = await supabase.from("task_attachments").insert({
    task_id: taskId,
    uploaded_by: user.id,
    file_name: file.name,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type || null,
  })

  if (insertError) {
    await supabase.storage.from("task-attachments").remove([filePath])
    return { error: insertError.message }
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  revalidatePath(`/projects/${slug}/tasks/table`)
  return { success: "File uploaded." }
}

export async function deleteTaskAttachment(attachmentId: string, slug: string) {
  const supabase = await createClient()
  const { data: attachment } = await supabase
    .from("task_attachments")
    .select("file_path")
    .eq("id", attachmentId)
    .maybeSingle()

  if (!attachment) {
    return { error: "Attachment not found." }
  }

  const { error } = await supabase.from("task_attachments").delete().eq("id", attachmentId)

  if (error) {
    return { error: error.message }
  }

  await supabase.storage.from("task-attachments").remove([attachment.file_path])

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  revalidatePath(`/projects/${slug}/tasks/table`)
  return { success: true }
}

export async function getTaskAttachmentUrl(attachmentId: string) {
  const supabase = await createClient()
  const { data: attachment } = await supabase
    .from("task_attachments")
    .select("file_path")
    .eq("id", attachmentId)
    .maybeSingle()

  if (!attachment) {
    return { error: "Attachment not found." }
  }

  const { data, error } = await supabase.storage
    .from("task-attachments")
    .createSignedUrl(attachment.file_path, 60 * 10)

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not create download link." }
  }

  return { url: data.signedUrl }
}
