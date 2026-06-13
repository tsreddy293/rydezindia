# Run this script from the project root after closing any terminal open inside .env.local
# Usage: powershell -ExecutionPolicy Bypass -File setup-env-local.ps1

$projectRoot = $PSScriptRoot
$envPath = Join-Path $projectRoot ".env.local"
$templatePath = Join-Path $projectRoot "env.local.template"

if (Test-Path $envPath -PathType Container) {
    Write-Host "Removing mistaken .env.local folder..." -ForegroundColor Yellow
    Remove-Item $envPath -Recurse -Force
}

if (Test-Path $templatePath) {
    Copy-Item $templatePath $envPath -Force
    Write-Host "Created .env.local from env.local.template" -ForegroundColor Green
} else {
    @"
# Supabase
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SECRET_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
"@ | Set-Content -Path $envPath -Encoding UTF8
    Write-Host "Created .env.local" -ForegroundColor Green
}

Write-Host "Edit .env.local and replace YOUR_PUBLISHABLE_KEY and YOUR_SECRET_KEY from Supabase Dashboard -> Settings -> API"
