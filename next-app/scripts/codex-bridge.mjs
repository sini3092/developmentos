#!/usr/bin/env node
/**
 * Poll DevelopmentOS for @personal Codex jobs and run them locally.
 *
 * Usage:
 *   npm run codex-bridge -- --token YOUR_TOKEN --url https://developmentos.vercel.app
 *
 * Codex profile, model, and workspace path are read from Settings in the app.
 */

import { spawn, execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

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

function resolveCodexCommand(cliOverride, settingsCommand) {
  if (cliOverride && cliOverride !== "codex") {
    return cliOverride
  }
  if (settingsCommand?.trim()) {
    return settingsCommand.trim()
  }
  if (process.env.CODEX_CMD?.trim()) {
    return process.env.CODEX_CMD.trim()
  }

  try {
    const lookup = process.platform === "win32" ? "where.exe codex" : "which codex"
    const result = execSync(lookup, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    const line = result.split(/\r?\n/).map((entry) => entry.trim()).find(Boolean)
    if (line) {
      return line
    }
  } catch {
    // continue to common install paths
  }

  const localAppData = process.env.LOCALAPPDATA ?? ""
  const candidates = [
    join(localAppData, "Programs", "codex", "codex.exe"),
    join(localAppData, "Codex", "codex.exe"),
    join(homedir(), ".codex", "bin", "codex.exe"),
    join(homedir(), "AppData", "Roaming", "npm", "codex.cmd"),
  ]

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate
    }
  }

  try {
    const npmPrefix = execSync("npm prefix -g", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    const npmCandidates = [
      join(npmPrefix, "codex.cmd"),
      join(npmPrefix, "codex"),
      join(npmPrefix, "codex.exe"),
    ]
    for (const candidate of npmCandidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }
  } catch {
    // ignore
  }

  return cliOverride || "codex"
}

function discoverLocalCodexCatalog() {
  const codexDir = join(homedir(), ".codex")
  const workspaces = new Set()
  const models = new Set()

  if (!existsSync(codexDir)) {
    return { workspaces: [], models: [] }
  }

  try {
    for (const file of readdirSync(codexDir)) {
      if (file.endsWith(".config.toml")) {
        const name = file.replace(/\.config\.toml$/, "")
        if (name && name !== "config") {
          workspaces.add(name)
        }
      }
    }

    const mainConfig = join(codexDir, "config.toml")
    if (existsSync(mainConfig)) {
      const text = readFileSync(mainConfig, "utf8")
      for (const match of text.matchAll(/^\[profiles\.([^\]]+)\]/gm)) {
        if (match[1]) workspaces.add(match[1])
      }
      for (const match of text.matchAll(/^model\s*=\s*"([^"]+)"/gm)) {
        if (match[1]) models.add(match[1])
      }
    }
  } catch {
    return { workspaces: [], models: [] }
  }

  return {
    workspaces: [...workspaces].sort(),
    models: [...models].sort(),
  }
}

let lastCatalogSyncAt = 0

async function syncCatalog(url, token) {
  const now = Date.now()
  if (now - lastCatalogSyncAt < 60000) return
  lastCatalogSyncAt = now

  const catalog = discoverLocalCodexCatalog()
  if (catalog.workspaces.length === 0 && catalog.models.length === 0) return

  try {
    await apiRequest(url, token, "/api/bridge/codex/catalog", {
      method: "POST",
      body: JSON.stringify(catalog),
    })
    console.log(
      `[bridge] Synced Codex catalog: ${catalog.workspaces.length} workspace(s), ${catalog.models.length} model(s)`
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

function quoteWindowsArg(value) {
  const arg = String(value)
  if (!/[\s"&|<>^%!]/.test(arg)) {
    return arg
  }
  return `"${arg.replace(/"/g, '""')}"`
}

function spawnCodex(cmd, args, options) {
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd)) {
    const commandLine = [quoteWindowsArg(cmd), ...args.map(quoteWindowsArg)].join(" ")
    return spawn("cmd.exe", ["/d", "/s", "/c", commandLine], {
      ...options,
      shell: false,
    })
  }

  return spawn(cmd, args, {
    ...options,
    shell: false,
  })
}

function buildCodexArgs(settings, prompt) {
  const args = []

  if (settings?.codex_profile) {
    args.push("--profile", settings.codex_profile)
  }
  if (settings?.codex_model) {
    args.push("--model", settings.codex_model)
  }

  if (settings?.session_mode === "resume_last") {
    args.push("exec", "resume", "--last", prompt)
  } else {
    args.push("exec", prompt)
  }

  return args
}

function runCodex(cmd, cwd, settings, prompt, onProgress) {
  const args = buildCodexArgs(settings, prompt)

  return new Promise((resolvePromise, reject) => {
    const child = spawnCodex(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    })

    let stdout = ""
    let stderr = ""
    let lastProgressAt = 0

    function maybeProgress(chunk, stream) {
      const text = String(chunk).trim()
      if (!text) return
      const now = Date.now()
      if (now - lastProgressAt < 8000) return
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
        resolvePromise(stdout.trim() || "Codex completed with no output.")
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

  if (!context) {
    return userPrompt
  }

  return [
    context,
    "",
    "---",
    "",
    "User request from DevelopmentOS channel:",
    userPrompt,
    "",
    "You are Personal (Codex) for this DevelopmentOS project. Use the context above.",
    "If DevelopmentOS MCP tools are configured, prefer them for reading/updating tasks, board lists, and checklists.",
  ].join("\n")
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

  const profileLabel = settings?.codex_profile ? `profile \`${settings.codex_profile}\`` : "default profile"
  const modelLabel = settings?.codex_model ? `model \`${settings.codex_model}\`` : "default model"

  await patchJob(options.url, options.token, job.id, {
    status: "running",
    progress: `Personal (Codex) started a session (${profileLabel}, ${modelLabel}) in \`${cwd}\`.`,
  })

  try {
    const codexCmd = resolveCodexCommand(options.cmd, settings?.codex_command)
    if (codexCmd === "codex" && process.platform === "win32") {
      try {
        execSync("where.exe codex", { stdio: "ignore" })
      } catch {
        throw new Error(
          "Codex CLI not found on PATH. Run: npm install -g @openai/codex — the desktop app alone does not power @personal."
        )
      }
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
      message =
        "Codex CLI not found. Install with: npm install -g @openai/codex — then restart the bridge. " +
        "The Codex desktop app alone is not enough for @personal."
    } else if (/unexpected argument/i.test(message)) {
      message =
        `${message} This often happens when a multi-word prompt was split by Windows. Restart the bridge after updating — if it persists, try a shorter prompt or disable resume-last in Settings.`
    }
    await patchJob(options.url, options.token, job.id, {
      status: "failed",
      error: message,
    })
    console.error(`[bridge] Failed job ${job.id.slice(0, 8)}: ${message}`)
  }
}

async function poll(options) {
  await syncCatalog(options.url, options.token)

  const data = await apiRequest(options.url, options.token, "/api/bridge/codex/jobs")
  const jobs = data.jobs ?? []
  const settings = data.codex_settings ?? null

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

  console.log(`[bridge] Listening on ${options.url}`)
  console.log(`[bridge] Codex command: ${options.cmd}`)
  console.log(`[bridge] Fallback cwd: ${options.cwd}`)
  console.log("[bridge] Profile/model/workspace loaded from Settings on each poll.")

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
