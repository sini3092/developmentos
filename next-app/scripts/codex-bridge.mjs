#!/usr/bin/env node
/**
 * Poll DevelopmentOS for @personal Codex jobs and run them locally.
 *
 * Usage:
 *   npm run codex-bridge -- --token YOUR_TOKEN --url https://developmentos.vercel.app
 *
 * Codex profile, model, and workspace path are read from Settings in the app.
 */

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  formatCodexNotFoundError,
  loadBridgeEnv,
  resolveCodexCommand,
  resolveCodexInvocation,
} from "./lib/resolve-codex-cli.mjs"
import { discoverLocalCodexCatalog } from "./lib/discover-codex-catalog.mjs"
import { PERSONAL_BRIDGE_RULES } from "./lib/agent-personalities.mjs"

const bridgeRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const bridgeEnv = loadBridgeEnv(bridgeRoot)

function parseArgs(argv) {
  const options = {
    token: "",
    url: "http://localhost:3000",
    interval: 4000,
    cmd: "codex",
    cwd: process.cwd(),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--token") {
      options.token = argv[++index] ?? ""
    } else if (arg === "--url") {
      options.url = (argv[++index] ?? options.url).replace(/\/$/, "")
    } else if (arg === "--interval") {
      options.interval = Number(argv[++index] ?? options.interval)
    } else if (arg === "--cmd") {
      options.cmd = argv[++index] ?? options.cmd
    } else if (arg === "--cwd") {
      options.cwd = resolve(argv[++index] ?? options.cwd)
    }
  }

  return options
}

let lastCatalogSyncAt = 0

async function syncCatalog(url, token, settings) {
  const now = Date.now()
  if (now - lastCatalogSyncAt < 60000) return
  lastCatalogSyncAt = now

  const catalog = discoverLocalCodexCatalog()
  const workspacePath = settings?.codex_workspace_path?.trim()
  const projectPaths = [...catalog.projectPaths]
  if (
    workspacePath &&
    !projectPaths.some((path) => path.toLowerCase() === workspacePath.toLowerCase())
  ) {
    projectPaths.push(workspacePath)
  }

  if (
    catalog.profiles.length === 0 &&
    catalog.models.length === 0 &&
    projectPaths.length === 0
  ) {
    return
  }

  try {
    await apiRequest(url, token, "/api/bridge/codex/catalog", {
      method: "POST",
      body: JSON.stringify({
        workspaces: catalog.profiles,
        models: catalog.models,
        project_paths: projectPaths,
      }),
    })
    console.log(
      `[bridge] Synced Codex catalog: ${catalog.profiles.length} profile(s), ${projectPaths.length} project folder(s), ${catalog.models.length} model(s)`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog sync failed."
    console.error(`[bridge] ${message}`)
  }
}

async function apiRequest(url, token, path, init = {}) {
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `HTTP ${response.status}`)
  }

  return data
}

function spawnCodex(cmd, args, options) {
  const { command, argsPrefix } = resolveCodexInvocation(cmd)
  return spawn(command, [...argsPrefix, ...args], {
    ...options,
    shell: false,
  })
}

function buildCodexArgs(settings, workspacePath) {
  const args = ["exec"]
  const catalog = discoverLocalCodexCatalog()

  if (settings?.codex_profile && catalog.profiles.includes(settings.codex_profile)) {
    args.push("-p", settings.codex_profile)
  }

  if (settings?.codex_model) {
    args.push("-m", settings.codex_model)
  }

  if (workspacePath) {
    args.push("-C", workspacePath)
  }

  if (settings?.session_mode === "resume_last") {
    args.push("resume", "--last", "-")
  } else {
    args.push("-")
  }

  return args
}

function extractCodexResult(stdout, stderr) {
  const trimmedStdout = String(stdout ?? "").trim()
  if (trimmedStdout) {
    return trimmedStdout
  }

  const lines = String(stderr ?? "").split(/\r?\n/)
  const parts = []
  let capturing = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === "codex") {
      capturing = true
      parts.length = 0
      continue
    }
    if (capturing && (trimmed === "tokens used" || trimmed.startsWith("--------"))) {
      break
    }
    if (capturing) {
      parts.push(line)
    }
  }

  const fromStderr = parts.join("\n").trim()
  if (fromStderr) {
    return fromStderr
  }

  return String(stderr ?? "").trim() || "Codex completed with no output."
}

function runCodex(cmd, cwd, settings, prompt, onProgress) {
  const args = buildCodexArgs(settings, cwd)

  return new Promise((resolvePromise, reject) => {
    const child = spawnCodex(cmd, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    })

    child.stdin.write(prompt)
    child.stdin.end()

    let stdout = ""
    let stderr = ""
    let lastProgressAt = 0

    function maybeProgress(chunk, stream) {
      const text = String(chunk).trim()
      if (!text) return
      const now = Date.now()
      if (now - lastProgressAt < 4000) return
      lastProgressAt = now
      const preview = text.split("\n").find((line) => line.trim()) ?? text
      onProgress(preview.slice(0, 500))
    }

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk)
      maybeProgress(chunk, "stdout")
    })
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })

    child.on("error", (error) => {
      reject(error)
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise(extractCodexResult(stdout, stderr))
        return
      }
      reject(new Error(stderr.trim() || stdout.trim() || `Codex exited with code ${code}`))
    })
  })
}

async function patchJob(url, token, jobId, body) {
  await apiRequest(url, token, `/api/bridge/codex/jobs/${jobId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
}

function buildPromptWithContext(job) {
  const userPrompt = String(job.prompt ?? "").trim()
  const context = String(job.project_context ?? "").trim()
  const transcript = String(job.channel_transcript ?? "").trim()

  const sections = [PERSONAL_BRIDGE_RULES]

  if (context) {
    sections.push("", context)
  }

  if (transcript) {
    sections.push("", "## Recent channel chat (includes Souls and teammates)", transcript)
  }

  sections.push(
    "",
    "---",
    "",
    "User request from DevelopmentOS channel:",
    userPrompt,
    "",
    "Rules:",
    "- Board/task: DevelopmentOS context above (lists, remaining %, checklists).",
    "- Code/Godot: local project folder from session path.",
    "- You may lightly riff on Souls if they spoke recently — one line max, then deliver.",
    "- Be concise. Same language as the user."
  )

  return sections.join("\n")
}

async function processJob(options, job, settings) {
  const cwd = settings?.codex_workspace_path
    ? resolve(settings.codex_workspace_path)
    : options.cwd

  if (!existsSync(cwd)) {
    await patchJob(options.url, options.token, job.id, {
      status: "failed",
      error: `Workspace path does not exist: ${cwd}`,
    })
    return
  }

  console.log(`[bridge] Claiming job ${job.id.slice(0, 8)}…`)

  const profileLabel =
    settings?.codex_profile && discoverLocalCodexCatalog().profiles.includes(settings.codex_profile)
      ? `profile \`${settings.codex_profile}\``
      : "default profile"

  if (settings?.codex_profile && profileLabel === "default profile") {
    console.warn(
      `[bridge] Profile "${settings.codex_profile}" not found in ~/.codex — using default. Prosjektmappe ${cwd} is still used for code work.`
    )
  }
  const modelLabel = settings?.codex_model ? `model \`${settings.codex_model}\`` : "default model"

  await patchJob(options.url, options.token, job.id, {
    status: "running",
    progress: `Personal (Codex) started a session (${profileLabel}, ${modelLabel}) in \`${cwd}\`.`,
  })

  try {
    const resolution = resolveCodexCommand({
      cliOverride: options.cmd,
      settingsCommand: settings?.codex_command,
      bridgeEnv,
    })
    const codexCmd = resolution.command

    if (!resolution.found && !existsSync(codexCmd)) {
      throw new Error(formatCodexNotFoundError(resolution))
    }

    const result = await runCodex(
      codexCmd,
      cwd,
      settings,
      buildPromptWithContext(job),
      async (preview) => {
        try {
          await patchJob(options.url, options.token, job.id, {
            status: "progress",
            progress: `Personal (Codex) working…\n\n\`\`\`\n${preview}\n\`\`\``,
          })
        } catch {
          // ignore progress errors
        }
      }
    )

    await patchJob(options.url, options.token, job.id, {
      status: "completed",
      result,
    })
    console.log(`[bridge] Completed job ${job.id.slice(0, 8)}`)
  } catch (error) {
    let message = error instanceof Error ? error.message : "Codex failed."
    if (/not recognized|ENOENT/i.test(message)) {
      const resolution = resolveCodexCommand({
        cliOverride: options.cmd,
        settingsCommand: settings?.codex_command,
        bridgeEnv,
      })
      message = formatCodexNotFoundError(resolution)
    } else if (/unexpected argument/i.test(message)) {
      message =
        `${message} Restart start-personal.bat after updating the bridge. If it persists, try session mode "Ny samtale" in Settings.`
    }
    await patchJob(options.url, options.token, job.id, {
      status: "failed",
      error: message,
    })
    console.error(`[bridge] Failed job ${job.id.slice(0, 8)}: ${message}`)
  }
}

async function poll(options) {
  const data = await apiRequest(options.url, options.token, "/api/bridge/codex/jobs")
  const jobs = data.jobs ?? []
  const settings = data.codex_settings ?? null

  await syncCatalog(options.url, options.token, settings)

  for (const job of jobs) {
    await processJob(options, job, settings)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (!options.token) {
    console.error("Missing --token. Generate one in Settings → Personal / Codex.")
    process.exit(1)
  }

  if (bridgeEnv.CODEX_CMD) {
    process.env.CODEX_CMD = bridgeEnv.CODEX_CMD
  }

  const startupResolution = resolveCodexCommand({
    cliOverride: options.cmd,
    bridgeEnv,
  })

  console.log(`[bridge] Listening on ${options.url}`)
  console.log(`[bridge] Codex CLI: ${startupResolution.displayPath}`)
  if (!startupResolution.found) {
    console.warn("[bridge] Warning: Codex CLI was not resolved yet. Jobs may fail until it is installed.")
    console.warn("[bridge] Set CODEX_CMD in .env.bridge.local or Codex-kommando in Settings.")
  }
  console.log(`[bridge] Fallback cwd: ${options.cwd}`)
  console.log("[bridge] Profile/model/workspace loaded from Settings on each poll.")

  const catalog = discoverLocalCodexCatalog()
  if (catalog.projectPaths.length > 0) {
    console.log(`[bridge] Codex project folders: ${catalog.projectPaths.join(", ")}`)
  }

  while (true) {
    try {
      await poll(options)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Poll failed."
      console.error(`[bridge] ${message}`)
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, options.interval))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
