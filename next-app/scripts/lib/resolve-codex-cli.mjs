import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

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

export function loadBridgeEnv(root) {
  const fileVars = parseEnvFile(join(root, ".env.bridge.local"))
  return {
    ...fileVars,
    CODEX_CMD: process.env.CODEX_CMD?.trim() || fileVars.CODEX_CMD?.trim() || "",
  }
}

function tryWhere(command) {
  try {
    const lookup = process.platform === "win32" ? `where.exe ${command}` : `which ${command}`
    const result = execSync(lookup, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: process.env,
    })
    return result
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry && existsSync(entry))
  } catch {
    return null
  }
}

function npmGlobalPrefix() {
  try {
    return execSync("npm prefix -g", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      env: process.env,
    }).trim()
  } catch {
    return ""
  }
}

function collectCandidates() {
  const home = homedir()
  const appData = process.env.APPDATA ?? join(home, "AppData", "Roaming")
  const localAppData = process.env.LOCALAPPDATA ?? join(home, "AppData", "Local")
  const npmPrefix = npmGlobalPrefix()

  const candidates = [
    join(appData, "npm", "codex.cmd"),
    join(appData, "npm", "codex"),
    join(appData, "npm", "codex.exe"),
    join(home, "AppData", "Roaming", "npm", "codex.cmd"),
    join(home, "AppData", "Roaming", "npm", "codex"),
    join(home, ".codex", "bin", "codex.exe"),
    join(localAppData, "Programs", "codex", "codex.exe"),
    join(localAppData, "Codex", "codex.exe"),
  ]

  if (npmPrefix) {
    candidates.push(
      join(npmPrefix, "codex.cmd"),
      join(npmPrefix, "codex"),
      join(npmPrefix, "codex.exe"),
      join(npmPrefix, "node_modules", "@openai", "codex", "bin", "codex.js"),
      join(npmPrefix, "node_modules", "@openai", "codex", "dist", "cli.js")
    )
  }

  return candidates
}

export function resolveCodexCommand({
  cliOverride = "codex",
  settingsCommand = "",
  bridgeEnv = {},
} = {}) {
  const tried = []

  const explicit = [
    cliOverride !== "codex" ? cliOverride : "",
    settingsCommand?.trim(),
    bridgeEnv.CODEX_CMD,
    process.env.CODEX_CMD?.trim(),
  ].filter(Boolean)

  for (const command of explicit) {
    tried.push(command)
    if (existsSync(command)) {
      return { command, displayPath: command, tried, found: true }
    }
  }

  for (const command of ["codex.cmd", "codex", "codex.exe"]) {
    const located = tryWhere(command)
    tried.push(`where ${command}`)
    if (located) {
      return { command: located, displayPath: located, tried, found: true }
    }
  }

  for (const candidate of collectCandidates()) {
    tried.push(candidate)
    if (candidate && existsSync(candidate)) {
      return { command: candidate, displayPath: candidate, tried, found: true }
    }
  }

  return {
    command: cliOverride || "codex",
    displayPath: cliOverride || "codex",
    tried,
    found: false,
  }
}

export function formatCodexNotFoundError(resolution) {
  const searched = resolution.tried.slice(-6).join("\n  - ")
  return (
    "Codex CLI not found. Install with: npm install -g @openai/codex — then restart the bridge.\n" +
    "The Codex desktop app alone is not enough for @personal.\n\n" +
    "Tips for Windows:\n" +
    "  1. Close and reopen start-personal.bat after installing\n" +
    "  2. Add CODEX_CMD to .env.bridge.local (full path to codex.cmd)\n" +
    "  3. Or set Codex-kommando in Settings → Personal / Codex\n\n" +
    `Searched:\n  - ${searched}`
  )
}
