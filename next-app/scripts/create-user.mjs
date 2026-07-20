#!/usr/bin/env node
/**
 * Create a user (and optional workspace) via the Supabase service role.
 *
 * Usage:
 *   node scripts/create-user.mjs --email you@studio.com --password "secret" --name "Your Name"
 *   node scripts/create-user.mjs --email you@studio.com --password "secret" --name "Your Name" --workspace "Studio" --slug studio
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local")
    const content = readFileSync(envPath, "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const index = trimmed.indexOf("=")
      if (index === -1) continue
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local is optional if vars are already exported
  }
}

function readArg(flag) {
  const index = process.argv.indexOf(flag)
  if (index === -1 || !process.argv[index + 1]) {
    return null
  }
  return process.argv[index + 1]
}

loadEnvLocal()

const email = readArg("--email")
const password = readArg("--password")
const displayName = readArg("--name")
const workspaceName = readArg("--workspace")
const workspaceSlug = readArg("--slug")

if (!email || !password || !displayName) {
  console.error(
    "Usage: node scripts/create-user.mjs --email <email> --password <password> --name <display name> [--workspace <name>] [--slug <slug>]"
  )
  process.exit(1)
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.")
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: displayName },
})

if (createError) {
  console.error("Failed to create user:", createError.message)
  process.exit(1)
}

console.log(`Created user ${email} (${createdUser.user.id})`)

if (workspaceName) {
  const slug =
    workspaceSlug ||
    workspaceName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceName.trim(),
      slug,
      created_by: createdUser.user.id,
    })
    .select("id")
    .single()

  if (workspaceError) {
    console.error("User created, but workspace failed:", workspaceError.message)
    process.exit(1)
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: createdUser.user.id,
    role: "owner",
  })

  if (memberError) {
    console.error("User created, but workspace membership failed:", memberError.message)
    process.exit(1)
  }

  console.log(`Created workspace "${workspaceName}" (${slug})`)
}

console.log("Done. Sign in at /auth/sign-in")
