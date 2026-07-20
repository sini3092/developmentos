import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import test from "node:test"

function request(child, message) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("MCP response timeout")), 5000)
    child.stdout.once("data", (chunk) => { clearTimeout(timeout); resolve(JSON.parse(chunk.toString().trim())) })
    child.stdin.write(`${JSON.stringify(message)}\n`)
  })
}

test("initializes and advertises the modular tool catalog", async () => {
  const child = spawn(process.execPath, ["scripts/developmentos-mcp.mjs"], { env: { ...process.env, DEVELOPMENTOS_TOKEN: "test-only-not-a-real-token" }, stdio: ["pipe", "pipe", "pipe"] })
  try {
    const initialized = await request(child, { jsonrpc: "2.0", id: 1, method: "initialize", params: {} })
    assert.equal(initialized.result.serverInfo.version, "1.0.0")
    const listed = await request(child, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
    assert.ok(listed.result.tools.length >= 25)
    assert.ok(listed.result.tools.some((tool) => tool.name === "developmentos_search"))
    assert.ok(listed.result.tools.every((tool) => tool.inputSchema.additionalProperties === false))
  } finally { child.kill() }
})
