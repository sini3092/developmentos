# One-time setup for local @personal bridge + Codex MCP config.
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-bridge-env.ps1 -Token "YOUR_TOKEN"

param(
    [Parameter(Mandatory = $true)]
    [string]$Token,
    [string]$Url = "https://developmentos.vercel.app"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.bridge.local"
$mcpScript = (Join-Path $PSScriptRoot "developmentos-mcp.mjs") -replace "\\", "/"

$codexCmd = $null
foreach ($candidate in @("codex.cmd", "codex", "codex.exe")) {
  $located = (& where.exe $candidate 2>$null | Select-Object -First 1)
  if ($located -and (Test-Path $located)) {
    $codexCmd = $located
    break
  }
}

if (-not $codexCmd) {
  $npmCodex = Join-Path $env:APPDATA "npm\codex.cmd"
  if (Test-Path $npmCodex) {
    $codexCmd = $npmCodex
  }
}

$codexLine = if ($codexCmd) { "CODEX_CMD=$codexCmd" } else { "# CODEX_CMD=" }

$content = @"
# Local bridge + MCP config (gitignored)
BRIDGE_TOKEN=$Token
DEVELOPMENTOS_URL=$Url
$codexLine
MCP_SCRIPT=$mcpScript
"@

Set-Content -Path $envFile -Value $content.Trim() -Encoding UTF8

Write-Host "Saved $envFile" -ForegroundColor Green
if ($codexCmd) {
  Write-Host "Detected Codex CLI: $codexCmd" -ForegroundColor Green
} else {
  Write-Host "Codex CLI not found yet. After npm install -g @openai/codex, re-run setup or add CODEX_CMD manually." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Start bridge + MCP helper with:" -ForegroundColor Cyan
Write-Host "  npm run personal-stack"
