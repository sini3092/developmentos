#!/usr/bin/env node
/**
 * Read .env.bridge.local and run the Codex bridge in the foreground.
 * Used by start-personal.bat and npm run personal-stack.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const envFile = join(root, ".env.bridge.local")

function parseEnvFile(path) {
  const vars = {}

  if (!existsSync(path)) {
    return vars
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separator = trimmed.indexOf("=")
    if (separator === -1) {
      continue
    }

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    vars[key] = value
  }

  return vars
}

const vars = parseEnvFile(envFile)
const token = vars.BRIDGE_TOKEN?.trim()
const url = (vars.DEVELOPMENTOS_URL?.trim() || "https://developmentos.vercel.app").replace(
  /\/$/,
  ""
)

if (!token) {
  console.error("Missing BRIDGE_TOKEN in .env.bridge.local")
  console.error('Run once: npm run setup-bridge -- -Token "YOUR_TOKEN"')
  process.exit(1)
}

console.log("DevelopmentOS @personal bridge")
console.log(`URL: ${url}`)
console.log("")
console.log("Keep this window open while using @personal in DevelopmentOS.")
console.log("Press Ctrl+C to stop.")
console.log("")

const bridge = spawn(
  process.execPath,
  [join(root, "scripts/codex-bridge.mjs"), "--token", token, "--url", url],
  {
    cwd: root,
    stdio: "inherit",
  }
)

bridge.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1)
  }
  process.exit(code ?? 0)
})
