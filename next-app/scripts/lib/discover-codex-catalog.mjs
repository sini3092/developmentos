import { existsSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

function decodeTomlPath(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
}

export function discoverLocalCodexCatalog() {
  const codexDir = join(homedir(), ".codex")
  const profiles = new Set()
  const projectPaths = new Set()
  const models = new Set()

  if (!existsSync(codexDir)) {
    return { profiles: [], projectPaths: [], models: [] }
  }

  try {
    for (const file of readdirSync(codexDir)) {
      if (file.endsWith(".config.toml")) {
        const name = file.replace(/\.config\.toml$/, "")
        if (name && name !== "config") {
          profiles.add(name)
        }
      }
    }

    const mainConfig = join(codexDir, "config.toml")
    if (existsSync(mainConfig)) {
      const text = readFileSync(mainConfig, "utf8")

      for (const match of text.matchAll(/^\[profiles\.([^\]]+)\]/gm)) {
        if (match[1]) {
          profiles.add(match[1])
        }
      }

      for (const match of text.matchAll(/^\[projects\.(['"][^'"]+['"])\]/gim)) {
        const path = decodeTomlPath(match[1])
        if (path) {
          projectPaths.add(path)
        }
      }

      for (const match of text.matchAll(/^model\s*=\s*"([^"]+)"/gm)) {
        if (match[1]) {
          models.add(match[1])
        }
      }
    }
  } catch {
    return { profiles: [], projectPaths: [], models: [] }
  }

  return {
    profiles: [...profiles].sort((a, b) => a.localeCompare(b)),
    projectPaths: [...projectPaths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    models: [...models].sort(),
  }
}
