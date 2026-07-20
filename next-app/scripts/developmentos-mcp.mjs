#!/usr/bin/env node
import { createInterface } from "node:readline"
import { DevelopmentOSClient } from "./developmentos-mcp/client.mjs"
import { assertInput } from "./developmentos-mcp/schema.mjs"
import { advertisedTools, toolsByName } from "./developmentos-mcp/tools/index.mjs"

function parseArgs(argv) {
  const options = {
    url: process.env.DEVELOPMENTOS_URL || "http://localhost:3000",
    token: process.env.DEVELOPMENTOS_TOKEN || "",
    timeoutMs: Number(process.env.DEVELOPMENTOS_TIMEOUT_MS || 20000),
  }
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--url") options.url = argv[++index] || options.url
    if (argv[index] === "--timeout-ms") options.timeoutMs = Number(argv[++index] || options.timeoutMs)
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
if (!options.token) {
  console.error("Missing DEVELOPMENTOS_TOKEN. Create a fresh bridge token; never pass tokens on the command line.")
  process.exit(1)
}
if (!/^https?:\/\//.test(options.url)) {
  console.error("DEVELOPMENTOS_URL must be an http(s) URL")
  process.exit(1)
}
const client = new DevelopmentOSClient({ baseUrl: options.url, token: options.token, timeoutMs: options.timeoutMs })
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)

async function callTool(name, args) {
  const definition = toolsByName.get(name)
  if (!definition) return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true }
  try {
    assertInput(definition.inputSchema, args ?? {})
    const data = await client.call(definition.operation, args ?? {})
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }], structuredContent: { data } }
  } catch (error) {
    return { content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }], isError: true }
  }
}

async function handle(message) {
  const { id, method, params } = message
  if (method === "initialize") return send({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "developmentos", version: "1.0.0" } } })
  if (method === "notifications/initialized") return
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} })
  if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: advertisedTools } })
  if (method === "tools/call") return send({ jsonrpc: "2.0", id, result: await callTool(params?.name, params?.arguments) })
  if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } })
}

const rl = createInterface({ input: process.stdin })
rl.on("line", (line) => {
  if (!line.trim()) return
  try { void handle(JSON.parse(line)).catch((error) => console.error(error)) }
  catch { send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) }
})
