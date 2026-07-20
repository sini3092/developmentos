export type WorkspaceRole = "owner" | "project_lead" | "team_member" | "viewer"
export type ProjectRole = WorkspaceRole
export type ProjectStatus = "active" | "archived"
export type ProjectVisibility = "private" | "workspace"
export type TaskStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "in_review"
  | "blocked"
  | "done"
  | "cancelled"
export type TaskPriority = "urgent" | "high" | "medium" | "low" | "none"
export type Discipline =
  | "design"
  | "programming"
  | "3d_art"
  | "2d_art"
  | "animation"
  | "audio"
  | "narrative"
  | "worldbuilding"
  | "ui_ux"
  | "testing"
  | "production"
export type InitiativeStatus =
  | "idea"
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
export type InitiativeHealth = "on_track" | "at_risk" | "off_track" | "no_status"
export type InitiativePriority = "urgent" | "high" | "medium" | "low" | "none"
export type PlanningHorizon = "now" | "next" | "later"
export type MilestoneStatus =
  | "draft"
  | "planned"
  | "active"
  | "completed"
  | "missed"
  | "cancelled"
export type NotificationType =
  | "task_assigned"
  | "task_comment"
  | "roadmap_update"
  | "task_blocked"
  | "mentioned"
  | "automation"
export type AutomationTriggerType = "task_created" | "task_status_changed" | "task_assigned"
export type AutomationActionType = "notify_assignee" | "set_task_status" | "add_label"
export type DocumentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "deprecated"
  | "archived"
export type LoreEntryType =
  | "character"
  | "faction"
  | "location"
  | "region"
  | "settlement"
  | "creature"
  | "enemy"
  | "deity"
  | "historical_event"
  | "culture"
  | "religion"
  | "item"
  | "weapon"
  | "artifact"
  | "resource"
  | "quest"
  | "story_arc"
  | "dialogue"
  | "book_or_note"
  | "magic_system"
  | "language"
  | "timeline_event"
  | "other"
export type CanonStatus =
  | "concept"
  | "draft"
  | "review"
  | "canon"
  | "retconned"
  | "archived"
export type AssetType =
  | "mesh"
  | "texture"
  | "material"
  | "sprite"
  | "animation"
  | "audio"
  | "vfx"
  | "ui"
  | "level"
  | "prefab"
  | "script"
  | "other"
export type AssetStatus =
  | "concept"
  | "wip"
  | "in_review"
  | "approved"
  | "deprecated"
  | "archived"
export type DecisionStatus =
  | "proposed"
  | "discussing"
  | "accepted"
  | "rejected"
  | "superseded"
export type DecisionLinkType =
  | "task"
  | "design_document"
  | "lore_entry"
  | "initiative"
export type TaskReferenceType = "design_document" | "lore_entry"
export type ThemePreference = "light" | "dark" | "system"
export type DensityPreference = "comfortable" | "compact"
export type KnowledgeContentFormat = "markdown" | "tiptap"
export type LoreRelationshipType =
  | "related_to"
  | "parent_of"
  | "member_of"
  | "located_in"
  | "ally_of"
  | "enemy_of"

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          theme_preference: ThemePreference
          density_preference: DensityPreference
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          theme_preference?: ThemePreference
          density_preference?: DensityPreference
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          theme_preference?: ThemePreference
          density_preference?: DensityPreference
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          created_by: string | null
          openrouter_api_key: string | null
          openrouter_model: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_by?: string | null
          openrouter_api_key?: string | null
          openrouter_model?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_by?: string | null
          openrouter_api_key?: string | null
          openrouter_model?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: WorkspaceRole
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: WorkspaceRole
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: WorkspaceRole
          joined_at?: string
        }
        Relationships: []
      }
      workspace_invitations: {
        Row: {
          id: string
          workspace_id: string
          email: string
          role: WorkspaceRole
          invited_by: string | null
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          role?: WorkspaceRole
          invited_by?: string | null
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          role?: WorkspaceRole
          invited_by?: string | null
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          workspace_id: string
          name: string
          slug: string
          description: string | null
          color: string
          status: ProjectStatus
          visibility: ProjectVisibility
          created_by: string | null
          created_at: string
          updated_at: string
          archived_at: string | null
          task_prefix: string
          github_repo_url: string | null
          github_owner: string | null
          github_repo_name: string | null
          github_webhook_secret: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          slug: string
          description?: string | null
          color?: string
          status?: ProjectStatus
          visibility?: ProjectVisibility
          created_by?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          task_prefix?: string
          github_repo_url?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_webhook_secret?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string
          status?: ProjectStatus
          visibility?: ProjectVisibility
          created_by?: string | null
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          task_prefix?: string
          github_repo_url?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_webhook_secret?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: ProjectRole
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: ProjectRole
          joined_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: ProjectRole
          joined_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          number: number
          identifier: string
          title: string
          description: string | null
          status: TaskStatus
          priority: TaskPriority
          assignee_id: string | null
          creator_id: string
          discipline: Discipline | null
          parent_task_id: string | null
          start_date: string | null
          due_date: string | null
          estimate_hours: number | null
          progress: number
          board_position: number
          initiative_id: string | null
          milestone_id: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          number: number
          identifier: string
          title: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          assignee_id?: string | null
          creator_id: string
          discipline?: Discipline | null
          parent_task_id?: string | null
          start_date?: string | null
          due_date?: string | null
          estimate_hours?: number | null
          progress?: number
          board_position?: number
          initiative_id?: string | null
          milestone_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          number?: number
          identifier?: string
          title?: string
          description?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          assignee_id?: string | null
          creator_id?: string
          discipline?: Discipline | null
          parent_task_id?: string | null
          start_date?: string | null
          due_date?: string | null
          estimate_hours?: number | null
          progress?: number
          board_position?: number
          initiative_id?: string | null
          milestone_id?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      initiatives: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          summary: string | null
          owner_id: string | null
          status: InitiativeStatus
          priority: InitiativePriority
          health: InitiativeHealth
          planning_horizon: PlanningHorizon
          progress: number
          target_start: string | null
          target_completion: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          summary?: string | null
          owner_id?: string | null
          status?: InitiativeStatus
          priority?: InitiativePriority
          health?: InitiativeHealth
          planning_horizon?: PlanningHorizon
          progress?: number
          target_start?: string | null
          target_completion?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          name?: string
          slug?: string
          summary?: string | null
          owner_id?: string | null
          status?: InitiativeStatus
          priority?: InitiativePriority
          health?: InitiativeHealth
          planning_horizon?: PlanningHorizon
          progress?: number
          target_start?: string | null
          target_completion?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      initiative_updates: {
        Row: {
          id: string
          initiative_id: string
          author_id: string
          health: InitiativeHealth
          progress: number
          summary: string
          accomplishments: string | null
          blockers: string | null
          next_steps: string | null
          created_at: string
        }
        Insert: {
          id?: string
          initiative_id: string
          author_id: string
          health: InitiativeHealth
          progress: number
          summary: string
          accomplishments?: string | null
          blockers?: string | null
          next_steps?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          initiative_id?: string
          author_id?: string
          health?: InitiativeHealth
          progress?: number
          summary?: string
          accomplishments?: string | null
          blockers?: string | null
          next_steps?: string | null
          created_at?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          initiative_id: string | null
          name: string
          slug: string
          description: string | null
          owner_id: string | null
          status: MilestoneStatus
          health: InitiativeHealth
          progress: number
          target_start: string | null
          target_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          initiative_id?: string | null
          name: string
          slug: string
          description?: string | null
          owner_id?: string | null
          status?: MilestoneStatus
          health?: InitiativeHealth
          progress?: number
          target_start?: string | null
          target_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          initiative_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          owner_id?: string | null
          status?: MilestoneStatus
          health?: InitiativeHealth
          progress?: number
          target_start?: string | null
          target_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      milestone_updates: {
        Row: {
          id: string
          milestone_id: string
          author_id: string
          health: InitiativeHealth
          progress: number
          summary: string
          accomplishments: string | null
          blockers: string | null
          next_steps: string | null
          created_at: string
        }
        Insert: {
          id?: string
          milestone_id: string
          author_id: string
          health: InitiativeHealth
          progress: number
          summary: string
          accomplishments?: string | null
          blockers?: string | null
          next_steps?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          milestone_id?: string
          author_id?: string
          health?: InitiativeHealth
          progress?: number
          summary?: string
          accomplishments?: string | null
          blockers?: string | null
          next_steps?: string | null
          created_at?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          id: string
          task_id: string
          author_id: string
          body: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          author_id: string
          body: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          author_id?: string
          body?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          id: string
          task_id: string
          uploaded_by: string
          file_name: string
          file_path: string
          file_size: number
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          uploaded_by: string
          file_name: string
          file_path: string
          file_size: number
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          uploaded_by?: string
          file_name?: string
          file_path?: string
          file_size?: number
          mime_type?: string | null
          created_at?: string
        }
        Relationships: []
      }
      labels: {
        Row: {
          id: string
          project_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      task_labels: {
        Row: {
          task_id: string
          label_id: string
        }
        Insert: {
          task_id: string
          label_id: string
        }
        Update: {
          task_id?: string
          label_id?: string
        }
        Relationships: []
      }
      task_reference_links: {
        Row: {
          id: string
          task_id: string
          reference_type: TaskReferenceType
          reference_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          reference_type: TaskReferenceType
          reference_id: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          reference_type?: TaskReferenceType
          reference_id?: string
          created_at?: string
        }
        Relationships: []
      }
      task_dependencies: {
        Row: {
          id: string
          task_id: string
          depends_on_task_id: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          depends_on_task_id: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          depends_on_task_id?: string
          created_at?: string
        }
        Relationships: []
      }
      project_automations: {
        Row: {
          id: string
          project_id: string
          name: string
          enabled: boolean
          trigger_type: AutomationTriggerType
          trigger_config: Json
          condition_priority: TaskPriority | null
          condition_discipline: Discipline | null
          condition_unassigned: boolean
          action_type: AutomationActionType
          action_config: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          enabled?: boolean
          trigger_type: AutomationTriggerType
          trigger_config?: Json
          condition_priority?: TaskPriority | null
          condition_discipline?: Discipline | null
          condition_unassigned?: boolean
          action_type: AutomationActionType
          action_config?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          enabled?: boolean
          trigger_type?: AutomationTriggerType
          trigger_config?: Json
          condition_priority?: TaskPriority | null
          condition_discipline?: Discipline | null
          condition_unassigned?: boolean
          action_type?: AutomationActionType
          action_config?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_checklist_items: {
        Row: {
          id: string
          task_id: string
          title: string
          completed: boolean
          position: number
          completed_by: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          title: string
          completed?: boolean
          position?: number
          completed_by?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          title?: string
          completed?: boolean
          position?: number
          completed_by?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      github_connections: {
        Row: {
          id: string
          user_id: string
          github_user_id: number
          github_username: string
          access_token: string
          scope: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          github_user_id: number
          github_username: string
          access_token: string
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          github_user_id?: number
          github_username?: string
          access_token?: string
          scope?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_github_pull_requests: {
        Row: {
          id: string
          task_id: string
          repo_owner: string
          repo_name: string
          pr_number: number
          pr_url: string
          pr_title: string
          pr_state: string
          linked_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          repo_owner: string
          repo_name: string
          pr_number: number
          pr_url: string
          pr_title: string
          pr_state?: string
          linked_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          repo_owner?: string
          repo_name?: string
          pr_number?: number
          pr_url?: string
          pr_title?: string
          pr_state?: string
          linked_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_github_branches: {
        Row: {
          id: string
          task_id: string
          repo_owner: string
          repo_name: string
          branch_name: string
          linked_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          repo_owner: string
          repo_name: string
          branch_name: string
          linked_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          repo_owner?: string
          repo_name?: string
          branch_name?: string
          linked_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      github_webhook_deliveries: {
        Row: {
          id: string
          delivery_id: string
          project_id: string
          event_type: string
          created_at: string
        }
        Insert: {
          id?: string
          delivery_id: string
          project_id: string
          event_type: string
          created_at?: string
        }
        Update: {
          id?: string
          delivery_id?: string
          project_id?: string
          event_type?: string
          created_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          user_id: string
          push_enabled: boolean
          push_task_assigned: boolean
          push_task_comment: boolean
          push_task_blocked: boolean
          push_roadmap_update: boolean
          push_mentioned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          push_enabled?: boolean
          push_task_assigned?: boolean
          push_task_comment?: boolean
          push_task_blocked?: boolean
          push_roadmap_update?: boolean
          push_mentioned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          push_enabled?: boolean
          push_task_assigned?: boolean
          push_task_comment?: boolean
          push_task_blocked?: boolean
          push_roadmap_update?: boolean
          push_mentioned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          type: NotificationType
          title: string
          body: string | null
          link: string | null
          entity_type: string | null
          entity_id: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          type: NotificationType
          title: string
          body?: string | null
          link?: string | null
          entity_type?: string | null
          entity_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          body?: string | null
          link?: string | null
          entity_type?: string | null
          entity_id?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_notification_queue: {
        Row: {
          id: string
          notification_id: string
          created_at: string
          delivered_at: string | null
        }
        Insert: {
          id?: string
          notification_id: string
          created_at?: string
          delivered_at?: string | null
        }
        Update: {
          id?: string
          notification_id?: string
          created_at?: string
          delivered_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          id: string
          workspace_id: string
          project_id: string | null
          actor_id: string | null
          event_type: string
          entity_type: string
          entity_id: string
          previous_value: Json | null
          new_value: Json | null
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id?: string | null
          actor_id?: string | null
          event_type: string
          entity_type: string
          entity_id: string
          previous_value?: Json | null
          new_value?: Json | null
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string | null
          actor_id?: string | null
          event_type?: string
          entity_type?: string
          entity_id?: string
          previous_value?: Json | null
          new_value?: Json | null
          message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      agent_jobs: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          channel_id: string
          trigger_message_id: string
          agent_name: string
          status: string
          prompt: string
          result: string | null
          error: string | null
          codex_session_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          channel_id: string
          trigger_message_id: string
          agent_name: string
          status?: string
          prompt: string
          result?: string | null
          error?: string | null
          codex_session_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          channel_id?: string
          trigger_message_id?: string
          agent_name?: string
          status?: string
          prompt?: string
          result?: string | null
          error?: string | null
          codex_session_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_codex_settings: {
        Row: {
          user_id: string
          codex_profile: string | null
          codex_model: string | null
          codex_workspace_path: string | null
          codex_command: string | null
          session_mode: string
          discovered_workspaces: string[]
          discovered_models: string[]
          catalog_updated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          codex_profile?: string | null
          codex_model?: string | null
          codex_workspace_path?: string | null
          codex_command?: string | null
          session_mode?: string
          discovered_workspaces?: string[]
          discovered_models?: string[]
          catalog_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          codex_profile?: string | null
          codex_model?: string | null
          codex_workspace_path?: string | null
          codex_command?: string | null
          session_mode?: string
          discovered_workspaces?: string[]
          discovered_models?: string[]
          catalog_updated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_bridge_tokens: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          label: string
          last_used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token_hash: string
          label?: string
          last_used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token_hash?: string
          label?: string
          last_used_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      project_channels: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          description: string | null
          is_default: boolean
          position: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          description?: string | null
          is_default?: boolean
          position?: number
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          name?: string
          slug?: string
          description?: string | null
          is_default?: boolean
          position?: number
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      channel_messages: {
        Row: {
          id: string
          channel_id: string
          author_id: string | null
          agent_name: string | null
          body: string
          parent_message_id: string | null
          linked_task_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          author_id?: string | null
          agent_name?: string | null
          body: string
          parent_message_id?: string | null
          linked_task_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          author_id?: string | null
          agent_name?: string | null
          body?: string
          parent_message_id?: string | null
          linked_task_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
      design_documents: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          title: string
          slug: string
          category: string
          summary: string | null
          content: string
          content_json: Json | null
          content_format: KnowledgeContentFormat
          status: DocumentStatus
          author_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          title: string
          slug: string
          category?: string
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          status?: DocumentStatus
          author_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          title?: string
          slug?: string
          category?: string
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          status?: DocumentStatus
          author_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          asset_type: AssetType
          status: AssetStatus
          description: string | null
          owner_id: string | null
          version: string
          source_path: string | null
          export_path: string | null
          engine_path: string | null
          preview_url: string | null
          tags: string[]
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          asset_type?: AssetType
          status?: AssetStatus
          description?: string | null
          owner_id?: string | null
          version?: string
          source_path?: string | null
          export_path?: string | null
          engine_path?: string | null
          preview_url?: string | null
          tags?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          name?: string
          slug?: string
          asset_type?: AssetType
          status?: AssetStatus
          description?: string | null
          owner_id?: string | null
          version?: string
          source_path?: string | null
          export_path?: string | null
          engine_path?: string | null
          preview_url?: string | null
          tags?: string[]
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_task_links: {
        Row: {
          asset_id: string
          task_id: string
          created_at: string
        }
        Insert: {
          asset_id: string
          task_id: string
          created_at?: string
        }
        Update: {
          asset_id?: string
          task_id?: string
          created_at?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          title: string
          slug: string
          context: string
          problem: string
          options: string
          selected_option: string | null
          reasoning: string | null
          status: DecisionStatus
          owner_id: string | null
          superseded_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          title: string
          slug: string
          context?: string
          problem?: string
          options?: string
          selected_option?: string | null
          reasoning?: string | null
          status?: DecisionStatus
          owner_id?: string | null
          superseded_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          title?: string
          slug?: string
          context?: string
          problem?: string
          options?: string
          selected_option?: string | null
          reasoning?: string | null
          status?: DecisionStatus
          owner_id?: string | null
          superseded_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      decision_links: {
        Row: {
          id: string
          decision_id: string
          link_type: DecisionLinkType
          linked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          link_type: DecisionLinkType
          linked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          decision_id?: string
          link_type?: DecisionLinkType
          linked_id?: string
          created_at?: string
        }
        Relationships: []
      }
      design_document_versions: {
        Row: {
          id: string
          document_id: string
          version_number: number
          title: string
          summary: string | null
          content: string
          content_json: Json | null
          content_format: KnowledgeContentFormat
          category: string
          status: DocumentStatus
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          version_number: number
          title: string
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          category: string
          status: DocumentStatus
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          version_number?: number
          title?: string
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          category?: string
          status?: DocumentStatus
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      lore_entry_versions: {
        Row: {
          id: string
          entry_id: string
          version_number: number
          name: string
          summary: string | null
          content: string
          content_json: Json | null
          content_format: KnowledgeContentFormat
          entry_type: LoreEntryType
          canon_status: CanonStatus
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entry_id: string
          version_number: number
          name: string
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          entry_type: LoreEntryType
          canon_status: CanonStatus
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entry_id?: string
          version_number?: number
          name?: string
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          entry_type?: LoreEntryType
          canon_status?: CanonStatus
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      lore_entry_relationships: {
        Row: {
          id: string
          source_entry_id: string
          target_entry_id: string
          relationship_type: LoreRelationshipType
          label: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          source_entry_id: string
          target_entry_id: string
          relationship_type?: LoreRelationshipType
          label?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          source_entry_id?: string
          target_entry_id?: string
          relationship_type?: LoreRelationshipType
          label?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      lore_entries: {
        Row: {
          id: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          entry_type: LoreEntryType
          summary: string | null
          content: string
          content_json: Json | null
          content_format: KnowledgeContentFormat
          canon_status: CanonStatus
          author_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          project_id: string
          name: string
          slug: string
          entry_type?: LoreEntryType
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          canon_status?: CanonStatus
          author_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          project_id?: string
          name?: string
          slug?: string
          entry_type?: LoreEntryType
          summary?: string | null
          content?: string
          content_json?: Json | null
          content_format?: KnowledgeContentFormat
          canon_status?: CanonStatus
          author_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_workspace_with_owner: {
        Args: { ws_name: string; ws_slug: string }
        Returns: string
      }
      accept_workspace_invitation: {
        Args: { invite_token: string }
        Returns: string
      }
      get_invitation_preview: {
        Args: { invite_token: string }
        Returns: {
          email: string
          role: WorkspaceRole
          workspace_name: string
          expires_at: string
          accepted_at: string | null
        }[]
      }
      create_project_with_owner: {
        Args: {
          ws_id: string
          project_name: string
          project_slug: string
          project_description?: string | null
          project_color?: string
          project_visibility?: ProjectVisibility
          project_github_repo_url?: string | null
          project_github_owner?: string | null
          project_github_repo_name?: string | null
        }
        Returns: string
      }
      seed_starter_projects: {
        Args: { ws_id: string }
        Returns: number
      }
      create_task: {
        Args: {
          p_project_id: string
          p_title: string
          p_description?: string | null
          p_status?: TaskStatus
          p_priority?: TaskPriority
          p_assignee_id?: string | null
          p_discipline?: Discipline | null
          p_due_date?: string | null
        }
        Returns: Database["public"]["Tables"]["tasks"]["Row"]
      }
      post_initiative_update: {
        Args: {
          p_initiative_id: string
          p_health: InitiativeHealth
          p_progress: number
          p_summary: string
          p_accomplishments?: string | null
          p_blockers?: string | null
          p_next_steps?: string | null
        }
        Returns: string
      }
      seed_starter_initiatives: {
        Args: { p_project_id: string }
        Returns: number
      }
      seed_project_channels: {
        Args: { p_project_id: string }
        Returns: number
      }
      seed_starter_design_docs: {
        Args: { p_project_id: string }
        Returns: number
      }
      seed_starter_lore_entries: {
        Args: { p_project_id: string }
        Returns: number
      }
      seed_starter_assets: {
        Args: { p_project_id: string }
        Returns: number
      }
      seed_starter_decisions: {
        Args: { p_project_id: string }
        Returns: number
      }
      notify_channel_mention: {
        Args: {
          p_workspace_id: string
          p_user_id: string
          p_title: string
          p_body?: string | null
          p_link?: string | null
          p_message_id?: string | null
        }
        Returns: undefined
      }
      post_agent_channel_message: {
        Args: {
          p_channel_id: string
          p_body: string
          p_agent_name: string
          p_parent_message_id?: string | null
        }
        Returns: string
      }
      log_github_activity_event: {
        Args: {
          p_workspace_id: string
          p_project_id: string
          p_event_type: string
          p_entity_type: string
          p_entity_id: string
          p_new_value?: Json | null
          p_message?: string | null
        }
        Returns: undefined
      }
      create_automation_notification: {
        Args: {
          p_workspace_id: string
          p_user_id: string
          p_title: string
          p_body?: string | null
          p_link?: string | null
          p_entity_id?: string | null
        }
        Returns: undefined
      }
    }
    Enums: {
      workspace_role: WorkspaceRole
      project_role: ProjectRole
      project_status: ProjectStatus
      project_visibility: ProjectVisibility
      task_status: TaskStatus
      task_priority: TaskPriority
      discipline: Discipline
      initiative_status: InitiativeStatus
      initiative_health: InitiativeHealth
      initiative_priority: InitiativePriority
      planning_horizon: PlanningHorizon
      milestone_status: MilestoneStatus
      notification_type: NotificationType
      document_status: DocumentStatus
      lore_entry_type: LoreEntryType
      canon_status: CanonStatus
      asset_type: AssetType
      asset_status: AssetStatus
      decision_status: DecisionStatus
      decision_link_type: DecisionLinkType
      task_reference_type: TaskReferenceType
      theme_preference: ThemePreference
      density_preference: DensityPreference
      knowledge_content_format: KnowledgeContentFormat
      lore_relationship_type: LoreRelationshipType
      automation_action_type: AutomationActionType
      automation_trigger_type: AutomationTriggerType
    }
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
export type WorkspaceMember = Database["public"]["Tables"]["workspace_members"]["Row"]
export type WorkspaceInvitation =
  Database["public"]["Tables"]["workspace_invitations"]["Row"]

export type WorkspaceWithRole = Workspace & {
  role: WorkspaceRole
}

export type MemberWithProfile = WorkspaceMember & {
  profile: Profile | null
}

export type Project = Database["public"]["Tables"]["projects"]["Row"]
export type ProjectMember = Database["public"]["Tables"]["project_members"]["Row"]

export type ProjectMemberWithProfile = ProjectMember & {
  profile: Profile | null
}

export type ProjectWithMembership = Project & {
  membership: ProjectMember | null
}

export type Task = Database["public"]["Tables"]["tasks"]["Row"]
export type TaskComment = Database["public"]["Tables"]["task_comments"]["Row"]
export type TaskAttachment = Database["public"]["Tables"]["task_attachments"]["Row"]
export type Label = Database["public"]["Tables"]["labels"]["Row"]
export type TaskChecklistItem = Database["public"]["Tables"]["task_checklist_items"]["Row"]
export type GithubConnection = Database["public"]["Tables"]["github_connections"]["Row"]
export type TaskGithubPullRequest =
  Database["public"]["Tables"]["task_github_pull_requests"]["Row"]
export type TaskGithubBranch = Database["public"]["Tables"]["task_github_branches"]["Row"]
export type TaskDependency = Database["public"]["Tables"]["task_dependencies"]["Row"]
export type ProjectAutomation = Database["public"]["Tables"]["project_automations"]["Row"]
export type ActivityEvent = Database["public"]["Tables"]["activity_events"]["Row"]
export type Initiative = Database["public"]["Tables"]["initiatives"]["Row"]
export type InitiativeUpdate = Database["public"]["Tables"]["initiative_updates"]["Row"]
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"]
export type MilestoneUpdate = Database["public"]["Tables"]["milestone_updates"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type NotificationPreferences =
  Database["public"]["Tables"]["notification_preferences"]["Row"]
export type PushSubscription = Database["public"]["Tables"]["push_subscriptions"]["Row"]

export type InitiativeWithOwner = Initiative & {
  owner: Profile | null
  milestone_count: number
  task_count: number
  task_done_count?: number
  task_open_count?: number
}

export type InitiativeDetail = InitiativeWithOwner & {
  updates: Array<InitiativeUpdate & { author: Profile | null }>
  milestones: Milestone[]
}

export type MilestoneWithOwner = Milestone & {
  owner: Profile | null
  initiative: Pick<Initiative, "id" | "name" | "slug"> | null
  task_count: number
}

export type ProjectChannel = Database["public"]["Tables"]["project_channels"]["Row"]
export type ChannelMessage = Database["public"]["Tables"]["channel_messages"]["Row"]
export type MessageReaction = Database["public"]["Tables"]["message_reactions"]["Row"]
export type DesignDocument = Database["public"]["Tables"]["design_documents"]["Row"]
export type DesignDocumentVersion =
  Database["public"]["Tables"]["design_document_versions"]["Row"]
export type LoreEntry = Database["public"]["Tables"]["lore_entries"]["Row"]
export type LoreEntryVersion = Database["public"]["Tables"]["lore_entry_versions"]["Row"]
export type LoreEntryRelationship =
  Database["public"]["Tables"]["lore_entry_relationships"]["Row"]
export type Asset = Database["public"]["Tables"]["assets"]["Row"]
export type AssetTaskLink = Database["public"]["Tables"]["asset_task_links"]["Row"]
export type Decision = Database["public"]["Tables"]["decisions"]["Row"]
export type DecisionLink = Database["public"]["Tables"]["decision_links"]["Row"]

export type ChannelMessageWithAuthor = ChannelMessage & {
  author: Profile | null
}

export type ChannelWithMessages = ProjectChannel & {
  messages: ChannelMessageWithAuthor[]
}

export type DesignDocumentWithAuthor = DesignDocument & {
  author: Profile | null
}

export type DesignDocumentDetail = DesignDocumentWithAuthor & {
  versions: Array<DesignDocumentVersion & { author: Profile | null }>
}

export type LoreEntryWithAuthor = LoreEntry & {
  author: Profile | null
}

export type ResolvedLoreRelationship = LoreEntryRelationship & {
  target_name: string
  target_slug: string
}

export type LoreEntryDetail = LoreEntryWithAuthor & {
  versions: Array<LoreEntryVersion & { author: Profile | null }>
  relationships: ResolvedLoreRelationship[]
}

export type LoreGraphNode = Pick<LoreEntry, "id" | "name" | "slug" | "entry_type">

export type LoreGraphEdge = {
  id: string
  sourceId: string
  targetId: string
  relationshipType: LoreRelationshipType
  label: string | null
}

export type LoreGraph = {
  nodes: LoreGraphNode[]
  edges: LoreGraphEdge[]
}

export type TaskDependencyGraphNode = Pick<Task, "id" | "identifier" | "title" | "status">

export type TaskDependencyGraphEdge = {
  id: string
  blockerId: string
  dependentId: string
}

export type TaskDependencyGraph = {
  nodes: TaskDependencyGraphNode[]
  edges: TaskDependencyGraphEdge[]
}

export type AssetWithOwner = Asset & {
  owner: Profile | null
}

export type AssetDetail = AssetWithOwner & {
  linked_tasks: Array<Pick<Task, "id" | "title" | "identifier">>
}

export type DecisionWithOwner = Decision & {
  owner: Profile | null
}

export type ResolvedDecisionLink = DecisionLink & {
  title: string
  href: string
}

export type DecisionDetail = DecisionWithOwner & {
  links: ResolvedDecisionLink[]
}
