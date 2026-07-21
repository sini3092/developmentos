# Starts the Codex bridge for @personal and prints MCP config for Codex.
# Requires .env.bridge.local (run setup-bridge-env.ps1 first).

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.bridge.local"

if (-not (Test-Path $envFile)) {
    Write-Host "Missing .env.bridge.local" -ForegroundColor Red
    Write-Host "Run: powershell -ExecutionPolicy Bypass -File scripts/setup-bridge-env.ps1 -Token `"YOUR_TOKEN`""
    exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') {
        $vars[$Matches[1]] = $Matches[2].Trim().Trim('"')
    }
}

$token = $vars["BRIDGE_TOKEN"]
$url = $vars["DEVELOPMENTOS_URL"]
$mcpScript = $vars["MCP_SCRIPT"]

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "BRIDGE_TOKEN is empty in .env.bridge.local" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrWhiteSpace($url)) {
    $url = "https://developmentos.vercel.app"
}

if ([string]::IsNullOrWhiteSpace($mcpScript)) {
    $mcpScript = ((Join-Path $PSScriptRoot "developmentos-mcp.mjs") -replace "\\", "/")
}

Write-Host "DevelopmentOS personal stack" -ForegroundColor Cyan
Write-Host "URL:  $url"
Write-Host ""

Write-Host "Starting Codex bridge in a new window..." -ForegroundColor Green
$bridgeCmd = "cd `"$root`"; npm run codex-bridge -- --token $token --url $url"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $bridgeCmd

Write-Host ""
Write-Host "MCP (for Codex app — Codex starts this when needed):" -ForegroundColor Yellow
Write-Host "Add to $env:USERPROFILE\.codex\config.toml :"
Write-Host ""
Write-Host @"
[mcp_servers.developmentos]
command = "node"
args = ["$mcpScript", "--token", "$token", "--url", "$url"]
"@
Write-Host ""
Write-Host "Bridge is running. Keep that window open while using @personal." -ForegroundColor Green
