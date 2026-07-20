#!/usr/bin/env node
/**
 * Poll DevelopmentOS for @personal Codex jobs and run them locally.
 *
 * Usage:
 *   npm run codex-bridge -- --token YOUR_TOKEN --url http://localhost:3000
 *
 * Optional:
 *   --interval 5000   Poll interval in ms (default 5000)
 *   --cmd codex       Command to run (default: codex)
 *   --cwd /path       Working directory for Codex
 */

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

function parseArgs(argv) {
  const options = {
    token: "",
    url: "http://localhost:3000",
    interval: 5000,
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

function runCodex(cmd, cwd, prompt) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, ["exec", prompt], {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk)
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

async function processJob(options, job) {
  console.log(`[bridge] Claiming job ${job.id.slice(0, 8)}…`)

  await apiRequest(options.url, options.token, `/api/bridge/codex/jobs/${job.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "running" }),
  })

  try {
    const result = await runCodex(options.cmd, options.cwd, job.prompt)
    await apiRequest(options.url, options.token, `/api/bridge/codex/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", result }),
    })
    console.log(`[bridge] Completed job ${job.id.slice(0, 8)}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Codex failed."
    await apiRequest(options.url, options.token, `/api/bridge/codex/jobs/${job.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed", error: message }),
    })
    console.error(`[bridge] Failed job ${job.id.slice(0, 8)}: ${message}`)
  }
}

async function poll(options) {
  const data = await apiRequest(options.url, options.token, "/api/bridge/codex/jobs")
  const jobs = data.jobs ?? []

  for (const job of jobs) {
    await processJob(options, job)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (!options.token) {
    console.error("Missing --token. Generate one in Settings → Codex Bridge.")
    process.exit(1)
  }

  if (!existsSync(options.cwd)) {
    console.error(`Working directory does not exist: ${options.cwd}`)
    process.exit(1)
  }

  console.log(`[bridge] Listening on ${options.url}`)
  console.log(`[bridge] Codex command: ${options.cmd}`)
  console.log(`[bridge] Working directory: ${options.cwd}`)

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
