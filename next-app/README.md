# DevelopmentOS

A Progressive Web App that acts as the central operating system for small game development teams — connecting planning, tasks, roadmaps, communication, design docs, lore, and activity in one workspace.

## Stack

- **Next.js 16** (App Router)
- **React 19** + TypeScript
- **Tailwind CSS 4** + shadcn/ui (Radix)
- **TanStack Query** for server state
- **Zustand** for local UI state
- **Motion** for animations (upcoming)
- **Supabase** for backend (upcoming)

## Getting started

```bash
cd next-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Command palette |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `D` | Toggle theme |

## Current phase

**Phase 15 — Global search** (complete)

- [x] `/search` page with type and project filters
- [x] Live search in command palette (`Ctrl/Cmd+K`)
- [x] Indexes tasks, projects, initiatives, milestones, design docs, lore, channels, members

**Phase 16 — Assets + Decisions** (complete)

- [x] Asset library at `/projects/[slug]/assets` with metadata (type, status, paths, tags, owner)
- [x] Asset detail with task linking
- [x] Decision log at `/projects/[slug]/decisions` with context, options, outcome
- [x] Decision detail with task linking
- [x] Starter seed data for both modules
- [x] Global search includes assets and decisions

**Phase 17 — Knowledge depth** (complete)

- [x] TipTap rich text editor for design docs and lore entries
- [x] Version history with restore for design docs and lore
- [x] Lore entry relationships (related to, parent of, located in, etc.)
- [x] Plain-text extraction kept for search compatibility

**Phase 18 — GitHub round 2** (complete)

- [x] GitHub webhooks (`/api/webhooks/github`) for push and pull_request events
- [x] Project webhook secret generation in settings
- [x] Branch linking on tasks
- [x] Commit and PR activity logged to project feed
- [x] Linked PR states auto-update from webhooks

**Phase 19 — PWA round 2** (complete)

- [x] Offline draft queue (IndexedDB) for channel messages, thread replies, and task comments
- [x] Auto-sync pending drafts when back online
- [x] Web push subscriptions with per-type notification preferences
- [x] Push delivery queue triggered on inbox notification insert
- [x] Service worker push + notification click handlers

**Phase 20 — Task connections** (complete)

- [x] Link assets and decisions to tasks from task detail (reuses existing link tables)
- [x] Link design docs and lore entries via new `task_reference_links` table
- [x] Connected references panel in task detail sheet with quick navigation

**Phase 21 — Account & preferences** (complete)

- [x] Account settings panel with display name, theme (light/dark/system), and density
- [x] Preferences stored on `profiles` and applied on sign-in
- [x] Workspace summary panel (name, slug, role, member/project counts)

**Phase 22 — Table bulk edit** (complete)

- [x] Row selection and select-all on task table view
- [x] Bulk update status, priority, assignee, and discipline
- [x] Bulk archive selected tasks

**Phase 23 — Workspace analytics** (complete)

- [x] Workspace-wide completion, open work, roadmap, and knowledge stats on Home
- [x] Bar charts for tasks by status, tasks by project, and initiative health
- [x] Reuses project analytics patterns at workspace scope (no migration)

**Phase 24 — Lore graph** (complete)

- [x] `/projects/[slug]/lore/graph` route with SVG relationship map
- [x] `getLoreGraph()` loads all project lore entries and directed relationships
- [x] Filter by entry type and relationship type; click nodes to inspect or open entries
- [x] Graph view link from lore library (no migration — uses `lore_entry_relationships`)

**Phase 25 — Task dependency graph** (complete)

- [x] `task_dependencies` table for blocked-by relationships with cycle prevention
- [x] Dependencies panel in task detail (blocked by / blocks)
- [x] `/projects/[slug]/tasks/graph` SVG dependency map with status filter
- [x] Graph toggle added to task view switcher

**Phase 26 — Automations** (complete)

- [x] `project_automations` rules with triggers, optional conditions, and actions
- [x] Triggers: task created, status changed, assigned
- [x] Actions: notify assignee, set status, add label
- [x] Project settings panel to create, pause, and delete rules
- [x] Rules execute from task create/update flows with cycle guard

## Supabase setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local` and fill in your keys
3. Apply migrations in order via the Supabase SQL editor or CLI:
   - `supabase/migrations/20260720150000_phase2_auth_workspaces.sql`
   - `supabase/migrations/20260720160000_phase3_projects.sql`
   - `supabase/migrations/20260720170000_phase4_tasks.sql`
   - `supabase/migrations/20260720180000_phase6_roadmap.sql`
   - `supabase/migrations/20260720190000_phase7_dashboard_notifications.sql`
   - `supabase/migrations/20260720200000_phase8_channels_design_lore.sql`
   - `supabase/migrations/20260720210000_phase10_github_repo.sql`
   - `supabase/migrations/20260720220000_phase11_github_oauth_task_extras.sql`
   - `supabase/migrations/20260720230000_phase12_channel_communication.sql`
   - `supabase/migrations/20260720240000_phase13_task_polish.sql`
   - `supabase/migrations/20260720250000_phase16_assets_decisions.sql`
   - `supabase/migrations/20260720260000_phase17_knowledge_depth.sql`
   - `supabase/migrations/20260720270000_phase18_github_webhooks_branches.sql`
   - `supabase/migrations/20260720280000_phase19_pwa_push_drafts.sql`
   - `supabase/migrations/20260720290000_phase20_task_connections.sql`
   - `supabase/migrations/20260720300000_phase21_account_preferences.sql`
   - `supabase/migrations/20260720310000_phase25_task_dependencies.sql`
   - `supabase/migrations/20260720320000_phase26_automations.sql`
4. In Supabase Auth settings, add `http://localhost:3000/auth/callback` as a redirect URL
5. **Create your master user** (public sign-up is disabled):

```bash
cd next-app
npm run create-user -- --email you@studio.com --password "your-secure-password" --name "Your Name" --workspace "My Studio" --slug my-studio
```

Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Then sign in at `/auth/sign-in`.

6. Add more teammates from **Settings** or **Team** → **Create member account** (workspace owners only).
7. For GitHub OAuth, create a GitHub OAuth app with callback `http://localhost:3000/api/integrations/github/callback` and set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env.local`

### Remote project

A Supabase project **developmentos** (`wuqqskaxvbetvkvkfemk`) has been provisioned with all migrations applied. Credentials are in `.env.local`.

## Project structure

```
next-app/
├── app/
│   ├── (app)/          # Authenticated app shell routes
│   ├── globals.css     # Design tokens
│   └── layout.tsx      # Root layout
├── components/
│   ├── layout/         # Shell, sidebar, topbar, command palette
│   ├── providers/      # Query client, tooltips
│   └── ui/             # shadcn/ui primitives
└── lib/
    ├── constants/      # Navigation, defaults
    └── stores/         # Zustand UI state
```

### Install as PWA

1. Run the app over HTTPS (or `localhost` in development)
2. Use your browser's **Install app** option, or the install prompt in Chrome/Edge
3. Offline: cached shell and `/offline` fallback; drafts queue locally and sync on reconnect
4. Push: generate VAPID keys (`npx web-push generate-vapid-keys`), add to `.env.local`, then enable in **Settings**

## Build order

Following the product plan, implementation proceeds in this order:

1. Application shell and design tokens
2. Authentication and workspaces
3. Projects and memberships
4. Task database and permissions
5. Task list and detail panel
6. … (see product spec for full sequence)

## License

Private — all rights reserved.
