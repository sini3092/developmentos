#!/usr/bin/env node
/**
 * DevelopmentOS MCP server for Codex.
 * Gives Codex read access to tasks/roadmap via your bridge token.
 *
 * Add in Codex (~/.codex/config.toml):
 *   [mcp_servers.developmentos]
 *   command = "node"
 *   args = ["D:/Apps/DevelopmentOS/next-app/scripts/developmentos-mcp.mjs", "--token", "YOUR_TOKEN", "--url", "https://developmentos.vercel.app"]
 *
 * Or: codex mcp add developmentos -- node path/to/developmentos-mcp.mjs --token TOKEN --url URL
 */

import { createInterface } from "node:readline"

function parseArgs(argv) {
  const options = { token: "", url: "http://localhost:3000" }
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--token") options.token = argv[++i] ?? ""
    if (argv[i] === "--url") options.url = (argv[++i] ?? options.url).replace(/\/$/, "")
  }
  return options
}

const options = parseArgs(process.argv.slice(2))

const tools = [
  {
    name: "developmentos_status",
    description: "Check DevelopmentOS bridge connection for the current user.",
    inputSchema: { type: "object", properties: {} },
  },
]

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

async function apiGet(path) {
  const response = await fetch(`${options.url}${path}`, {
    headers: { Authorization: `Bearer ${options.token}` },
  })
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function handleToolCall(name) {
  if (name === "developmentos_status") {
    const data = await apiGet("/api/bridge/codex/jobs")
    const jobCount = data.jobs?.length ?? 0
    return {
      content: [
        {
          type: "text",
          text: `DevelopmentOS bridge OK. Pending @personal jobs: ${jobCount}. Use @personal in project chat to queue Codex work.`,
        },
      ],
    }
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  }
}

async function handleMessage(message) {
  const { id, method, params } = message

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "developmentos", version: "0.1.0" },
      },
    })
    return
  }

  if (method === "notifications/initialized") {
    return
  }

  if (method === "tools/list") {
    send({ jsonrpc: "2.0", id, result: { tools } })
    return
  }

  if (method === "tools/call") {
    const result = await handleToolCall(params?.name)
    send({ jsonrpc: "2.0", id, result })
    return
  }

  if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } })
  }
}

if (!options.token) {
  console.error("Missing --token")
  process.exit(1)
}

const rl = createInterface({ input: process.stdin })
rl.on("line", (line) => {
  if (!line.trim()) return
  try {
    const message = JSON.parse(line)
    void handleMessage(message)
  } catch (error) {
    console.error(error)
  }
})
