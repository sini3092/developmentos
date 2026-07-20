export type CodexSessionMode = "new" | "resume_last"

export type UserCodexSettings = {
  user_id: string
  codex_profile: string | null
  codex_model: string | null
  codex_workspace_path: string | null
  session_mode: CodexSessionMode
  created_at: string
  updated_at: string
}

export type CodexSettingsView = Pick<
  UserCodexSettings,
  "codex_profile" | "codex_model" | "codex_workspace_path" | "session_mode"
> & {
  discovered_workspaces: string[]
  discovered_models: string[]
  catalog_updated_at: string | null
}

export const DEFAULT_CODEX_SETTINGS: CodexSettingsView = {
  codex_profile: null,
  codex_model: null,
  codex_workspace_path: null,
  session_mode: "new",
  discovered_workspaces: [],
  discovered_models: [],
  catalog_updated_at: null,
}
