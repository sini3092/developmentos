import { createClient } from "@/lib/supabase/server"
import { DEFAULT_CODEX_SETTINGS, type CodexSessionMode } from "@/lib/codex/types"

export async function getUserCodexSettings(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_codex_settings")
    .select(
      "codex_profile, codex_model, codex_workspace_path, codex_command, session_mode, discovered_workspaces, discovered_project_paths, discovered_models, catalog_updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle()

  if (!data) {
    return DEFAULT_CODEX_SETTINGS
  }

  return {
    codex_profile: data.codex_profile,
    codex_model: data.codex_model,
    codex_workspace_path: data.codex_workspace_path,
    codex_command: data.codex_command,
    session_mode: (data.session_mode === "resume_last" ? "resume_last" : "new") as CodexSessionMode,
    discovered_workspaces: data.discovered_workspaces ?? [],
    discovered_project_paths: data.discovered_project_paths ?? [],
    discovered_models: data.discovered_models ?? [],
    catalog_updated_at: data.catalog_updated_at,
  }
}
