# DevelopmentOS MCP server

The DevelopmentOS MCP server exposes scoped read/write tools for projects, roadmap, milestones, tasks, assignments, team members, activity, game design documents, lore, analytics, and search. The local process contains no database credentials: it calls the DevelopmentOS `/api/mcp` route with a per-user bridge token. The API hashes tokens at rest and checks workspace/project access on every request.

## Security and setup

The token previously shared in chat must be revoked and never reused. Generate a fresh bridge token in DevelopmentOS settings, then make it available only as an environment variable. Do not put it in command arguments, source control, screenshots, or shell history.

```powershell
$env:DEVELOPMENTOS_TOKEN = "<NEW_TOKEN>"
$env:DEVELOPMENTOS_URL = "https://developmentos.vercel.app"
node scripts/developmentos-mcp.mjs
```

The default URL is `http://localhost:3000`. `DEVELOPMENTOS_TIMEOUT_MS` optionally controls the API timeout (default 20000). Production should use HTTPS.

## Client configuration

Codex `~/.codex/config.toml`:

```toml
[mcp_servers.developmentos]
command = "node"
args = ["D:/Apps/DevelopmentOS/next-app/scripts/developmentos-mcp.mjs"]
env_vars = ["DEVELOPMENTOS_TOKEN", "DEVELOPMENTOS_URL"]
```

Claude Desktop (environment placeholders shown; substitute via your secret-management/launcher setup rather than committing a token):

```json
{
  "mcpServers": {
    "developmentos": {
      "command": "node",
      "args": ["D:/Apps/DevelopmentOS/next-app/scripts/developmentos-mcp.mjs"],
      "env": {
        "DEVELOPMENTOS_TOKEN": "${DEVELOPMENTOS_TOKEN}",
        "DEVELOPMENTOS_URL": "https://developmentos.vercel.app"
      }
    }
  }
}
```

Other MCP desktop clients can use the same stdio command and inherited variables. For Codex plugin installation, use `plugins/developmentos`; its manifest points to the same server.

## Tools

- Projects: `developmentos_projects_list`, `developmentos_projects_get`, `developmentos_projects_create`, `developmentos_projects_update`
- Roadmap and milestones: `developmentos_roadmap_list/create/update`, `developmentos_milestones_list/create/update`
- Tasks: `developmentos_tasks_list/get/create/update/comment`
- Delegation and team: `developmentos_assignments_list/delegate`, `developmentos_team_list/set_project_role`
- Knowledge and activity: `developmentos_activity_list`, `developmentos_design_wiki_list/upsert`, `developmentos_lore_list/upsert`
- Insights: `developmentos_analytics_get`, `developmentos_search`

Write operations validate inputs, enforce resource ownership boundaries, and require project-management permission for project metadata, roadmap/milestone management, and project roles. Task and knowledge edits follow normal project access. Responses are JSON and errors are returned as MCP tool errors without exposing credentials.

## Tests

```powershell
npm run test:mcp
npm run typecheck
npm run lint
```

The MCP protocol test uses a dummy token and only exercises local initialization/tool discovery; it does not contact the API. For an API smoke test, run the app locally with a fresh development token and ask the client to call `developmentos_projects_list`, then create/update a disposable task.

Example requests:

```json
{"name":"developmentos_tasks_list","arguments":{"projectSlug":"my-game","status":"blocked"}}
{"name":"developmentos_tasks_create","arguments":{"projectSlug":"my-game","title":"Profile loading hitch","priority":"high"}}
{"name":"developmentos_search","arguments":{"query":"combat loop","type":"all","limit":20}}
```
