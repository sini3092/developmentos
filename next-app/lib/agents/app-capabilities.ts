export const DEVELOPMENTOS_APP_CAPABILITIES = `## DevelopmentOS product guide (for agents)

DevelopmentOS is a game-dev project OS. Key areas:

### Task board (/projects/{slug}/tasks/board)
- Trello-style board with **custom lists** (board_lists), not status columns.
- Tasks live in a list via list_id and are ordered with board_position.
- Drag cards between lists; drag lists to reorder.
- Task cards show **remaining %** (100 - progress). Progress auto-syncs from checklist completion.
- Task detail: title, description, progress slider, reorderable checklist, comments, archive.
- Legacy task.status still exists in DB but the board UI is list-driven.

### Roadmap (/projects/{slug}/roadmap)
- Initiatives and milestones; initiative progress auto-syncs from linked tasks.
- Post initiative updates with health + progress.

### Channels (/projects/{slug}/channels)
- Team chat with threads, reactions, convert message → task.
- @souls — cloud AI (OpenRouter) with live project context.
- @personal — user's local Codex via bridge on their PC (+ optional DevelopmentOS MCP tools).

### Knowledge
- Design wiki, lore entries, decisions, assets — searchable and linkable to tasks.

### GitHub
- Link PRs/branches to tasks; in-app diff viewer.

### Settings
- Souls AI: OpenRouter key + model.
- Personal / Codex: bridge token, workspace path, profile, model, session mode.
- Members can be created with temporary passwords; users change password in Settings.

When changing tasks for the board, prefer list_id over status. Use checklist items to track granular work.`
