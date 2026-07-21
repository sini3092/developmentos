#!/usr/bin/env node
/**
 * Read .env.bridge.local and run the Codex bridge in the foreground.
 * Used by start-personal.bat and npm run personal-stack.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

import { loadBridgeEnv, resolveCodexCommand } from "./lib/resolve-codex-cli.mjs"

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
const bridgeEnv = loadBridgeEnv(root)
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

const resolution = resolveCodexCommand({ bridgeEnv })

console.log("DevelopmentOS @personal bridge")
console.log(`URL: ${url}`)
console.log(`Codex CLI: ${resolution.displayPath}`)
if (!resolution.found) {
  console.warn("")
  console.warn("Codex CLI not found yet. Install with: npm install -g @openai/codex")
  console.warn("Then restart this window, or add CODEX_CMD=... to .env.bridge.local")
}
console.log("")
console.log("Keep this window open while using @personal in DevelopmentOS.")
console.log("Press Ctrl+C to stop.")
console.log("")

const bridgeArgs = [
  join(root, "scripts/codex-bridge.mjs"),
  "--token",
  token,
  "--url",
  url,
]

if (resolution.found) {
  bridgeArgs.push("--cmd", resolution.command)
}

const bridge = spawn(process.execPath, bridgeArgs, {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    ...vars,
    CODEX_CMD: bridgeEnv.CODEX_CMD || resolution.command,
  },
})

bridge.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1)
  }
  process.exit(code ?? 0)
})
