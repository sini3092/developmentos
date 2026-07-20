# Add GitHub OAuth credentials to .env.local and Vercel.
# Usage (from next-app):
#   powershell -ExecutionPolicy Bypass -File scripts/setup-github-oauth.ps1 -ClientId "..." -ClientSecret "..."

param(
    [Parameter(Mandatory = $true)]
    [string]$ClientId,
    [Parameter(Mandatory = $true)]
    [string]$ClientSecret
)

$ErrorActionPreference = "Stop"
$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"

function Set-EnvLine {
    param([string]$Path, [string]$Name, [string]$Value)
    $lines = if (Test-Path $Path) { Get-Content $Path } else { @() }
    $pattern = "^\s*$([regex]::Escape($Name))\s*="
    $updated = $false
    $newLines = foreach ($line in $lines) {
        if ($line -match $pattern) {
            $updated = $true
            "$Name=$Value"
        } else {
            $line
        }
    }
    if (-not $updated) {
        $newLines += "$Name=$Value"
    }
    Set-Content -Path $Path -Value $newLines -Encoding utf8
}

Set-EnvLine -Path $envFile -Name "GITHUB_CLIENT_ID" -Value $ClientId
Set-EnvLine -Path $envFile -Name "GITHUB_CLIENT_SECRET" -Value $ClientSecret

Write-Host "Updated $envFile" -ForegroundColor Green

npx vercel env add GITHUB_CLIENT_ID production,preview --value $ClientId --yes
npx vercel env add GITHUB_CLIENT_SECRET production,preview --value $ClientSecret --yes

Write-Host ""
Write-Host "GitHub OAuth env vars saved locally and on Vercel (Production + Preview)." -ForegroundColor Green
Write-Host "Redeploy on Vercel, then go to Settings -> Connect GitHub." -ForegroundColor Cyan
