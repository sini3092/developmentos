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

$content = @"
# Local bridge + MCP config (gitignored)
BRIDGE_TOKEN=$Token
DEVELOPMENTOS_URL=$Url
MCP_SCRIPT=$mcpScript
"@

Set-Content -Path $envFile -Value $content.Trim() -Encoding UTF8

Write-Host "Saved $envFile" -ForegroundColor Green
Write-Host ""
Write-Host "Start bridge + MCP helper with:" -ForegroundColor Cyan
Write-Host "  npm run personal-stack"
