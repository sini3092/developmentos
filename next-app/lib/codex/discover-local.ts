import { existsSync, readdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export function discoverLocalCodexCatalog() {
  const codexDir = join(homedir(), ".codex")
  const workspaces = new Set<string>()
  const models = new Set<string>()

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
      const modelMatch = text.match(/^model\s*=\s*"([^"]+)"/m)
      if (modelMatch?.[1]) {
        models.add(modelMatch[1])
      }

      for (const match of text.matchAll(/^\[profiles\.([^\]]+)\]/gm)) {
        if (match[1]) {
          workspaces.add(match[1])
        }
      }

      for (const match of text.matchAll(/^model\s*=\s*"([^"]+)"/gm)) {
        if (match[1]) {
          models.add(match[1])
        }
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
