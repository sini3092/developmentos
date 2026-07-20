"use client"

import { useActionState, useState } from "react"
import { Bot } from "lucide-react"

import { createCodexBridgeToken, updateCodexSettings } from "@/lib/actions/integrations"
import type { CodexSettingsView } from "@/lib/codex/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CodexBridgePanelProps = {
  settings: CodexSettingsView
}

function formatCatalogAge(updatedAt: string | null) {
  if (!updatedAt) return null
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })
}

export function CodexBridgePanel({ settings }: CodexBridgePanelProps) {
  const [tokenState, tokenAction, tokenPending] = useActionState(createCodexBridgeToken, {})
  const [settingsState, settingsAction, settingsPending] = useActionState(updateCodexSettings, {})
  const [copied, setCopied] = useState(false)

  async function copyToken(token: string) {
    await navigator.clipboard.writeText(token)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
  const catalogAge = formatCatalogAge(settings.catalog_updated_at)
  const hasCatalog =
    settings.discovered_workspaces.length > 0 || settings.discovered_models.length > 0

  return (
    <Card className="border-border/60 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="size-4" />
          Personal / Codex (@personal)
        </CardTitle>
        <CardDescription>
          Kun du kan bruke din Personal-agent. Velg samme workspace og modell som i Codex-appen på
          PC-en din. Når du skriver @personal i chat, kjører Codex på maskinen din og svarer tilbake
          her.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <form action={settingsAction} className="space-y-4">
          <div>
            <p className="text-sm font-medium">Codex-innstillinger</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Workspace = prosjektet du har i Codex (f.eks. spillet ditt). Prosjektmappe = mappen
              Codex skal jobbe i på PC-en.
            </p>
            {hasCatalog ? (
              <p className="mt-1 text-xs text-success">
                Bridge fant Codex på PC-en{catalogAge ? ` (sist synket ${catalogAge})` : ""}.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Kjør bridge-scriptet på PC-en for å hente workspaces og modeller automatisk.
              </p>
            )}
          </div>
          {settingsState.error ? <p className="text-sm text-danger">{settingsState.error}</p> : null}
          {settingsState.success ? (
            <p className="text-sm text-success">{settingsState.success}</p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="codex-profile">Codex workspace</Label>
            <Input
              id="codex-profile"
              name="codexProfile"
              list="codex-workspaces"
              defaultValue={settings.codex_profile ?? ""}
              placeholder="f.eks. game-dev, default"
            />
            <datalist id="codex-workspaces">
              {settings.discovered_workspaces.map((workspace) => (
                <option key={workspace} value={workspace} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="codex-model">Modell</Label>
            <Input
              id="codex-model"
              name="codexModel"
              list="codex-models"
              defaultValue={settings.codex_model ?? ""}
              placeholder="f.eks. gpt-5.4, o4-mini"
            />
            <datalist id="codex-models">
              {settings.discovered_models.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="codex-workspace">Prosjektmappe på PC-en</Label>
            <Input
              id="codex-workspace"
              name="codexWorkspacePath"
              defaultValue={settings.codex_workspace_path ?? ""}
              placeholder="D:\Apps\MittSpill"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codex-command">Codex-kommando (valgfritt)</Label>
            <Input
              id="codex-command"
              name="codexCommand"
              defaultValue={settings.codex_command ?? ""}
              placeholder="C:\Users\...\AppData\Local\Programs\codex\codex.exe"
            />
            <p className="text-xs text-muted-foreground">
              Fyll ut hvis du får «codex is not recognized». Finn stien med{" "}
              <code className="rounded bg-muted px-1">where codex</code> i PowerShell.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-mode">Codex-samtale</Label>
            <select
              id="session-mode"
              name="sessionMode"
              defaultValue={settings.session_mode}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              <option value="new">Ny samtale for hver @personal-melding</option>
              <option value="resume_last">Fortsett siste Codex-samtale</option>
            </select>
          </div>
          <Button type="submit" disabled={settingsPending}>
            {settingsPending ? "Lagrer..." : "Lagre Codex-innstillinger"}
          </Button>
        </form>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">1. Bridge på PC-en</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bridge kobler DevelopmentOS til Codex på maskinen din. Den må kjøre mens du bruker
              @personal.
            </p>
          </div>
          {tokenState.error ? <p className="text-sm text-danger">{tokenState.error}</p> : null}
          {tokenState.success ? <p className="text-sm text-success">{tokenState.success}</p> : null}
          {tokenState.token ? (
            <div className="space-y-2">
              <Input readOnly value={tokenState.token} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyToken(tokenState.token!)}
              >
                {copied ? "Kopiert" : "Kopier token"}
              </Button>
            </div>
          ) : null}
          <form action={tokenAction}>
            <Button type="submit" disabled={tokenPending}>
              {tokenPending ? "Genererer..." : "Generer bridge-token"}
            </Button>
          </form>
          <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            {`npm run codex-bridge -- --token YOUR_TOKEN --url ${siteOrigin}`}
          </pre>

          <div>
            <p className="text-sm font-medium">2. MCP-plugin (valgfritt)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Lar Codex-appen lese status fra DevelopmentOS. Legg til i{" "}
              <code className="rounded bg-muted px-1">~/.codex/config.toml</code>:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              {`[mcp_servers.developmentos]
command = "node"
args = ["D:/Apps/DevelopmentOS/next-app/scripts/developmentos-mcp.mjs", "--token", "YOUR_TOKEN", "--url", "${siteOrigin}"]`}
            </pre>
            <p className="mt-2 text-xs text-muted-foreground">
              @personal bruker fortsatt bridge — MCP er ekstra, så Codex kan se prosjektet ditt når
              du chatter direkte i Codex.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Partneren din må sette opp sin egen Personal — din Codex kjører bare for dine @personal-meldinger.
      </CardFooter>
    </Card>
  )
}
