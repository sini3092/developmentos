import type { GithubConnection } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { getGithubOAuthConfig } from "@/lib/github/api"

export type GithubConnectionPublic = Pick<
  GithubConnection,
  "id" | "user_id" | "github_user_id" | "github_username" | "scope" | "created_at" | "updated_at"
>

export async function getGithubIntegrationStatus() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      configured: false,
      connected: false,
      connection: null as GithubConnectionPublic | null,
    }
  }

  const { data: connection } = await supabase
    .from("github_connections")
    .select("id, user_id, github_user_id, github_username, scope, created_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle()

  return {
    configured: getGithubOAuthConfig().isConfigured,
    connected: Boolean(connection),
    connection: (connection as GithubConnectionPublic | null) ?? null,
  }
}

export async function getGithubAccessToken() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data } = await supabase
    .from("github_connections")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle()

  return data?.access_token ?? null
}
