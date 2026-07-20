# Add remaining Vercel env vars for DevelopmentOS.
# Usage (from next-app):
#   powershell -ExecutionPolicy Bypass -File scripts/setup-vercel-env.ps1

$ErrorActionPreference = "Stop"
$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"

function Add-VercelEnv {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Environments,
        [switch]$Sensitive,
        [switch]$NoSensitive
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Host "Skipping $Name (no value)." -ForegroundColor Yellow
        return
    }

    $args = @(
        "vercel", "env", "add", $Name, $Environments,
        "--value", $Value,
        "--yes"
    )

    if ($Sensitive) { $args += "--sensitive" }
    if ($NoSensitive) { $args += "--no-sensitive" }

    & npx @args
}

Write-Host "Setting Vercel env for developmentos..." -ForegroundColor Cyan

$serviceRole = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $serviceRole -and (Test-Path $envFile)) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)\s*$') {
            $serviceRole = $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

Add-VercelEnv -Name "SUPABASE_SERVICE_ROLE_KEY" -Value $serviceRole -Environments "production,preview" -Sensitive

Write-Host ""
Write-Host "Done. Run: npx vercel env ls" -ForegroundColor Green
if (-not $serviceRole) {
    Write-Host ""
    Write-Host "SUPABASE_SERVICE_ROLE_KEY was not set." -ForegroundColor Yellow
    Write-Host "1. Supabase Dashboard -> Project Settings -> API -> service_role"
    Write-Host "2. Add to next-app/.env.local"
    Write-Host "3. Re-run this script, or:"
    Write-Host '   npx vercel env add SUPABASE_SERVICE_ROLE_KEY production,preview --value "YOUR_KEY" --yes'
}
