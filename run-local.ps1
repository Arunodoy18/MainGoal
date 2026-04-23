param(
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173,
    [string]$ApiUrl = "http://127.0.0.1:8000"
)

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $repoRoot "backend"
$frontendPath = Join-Path $repoRoot "frontend"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$backendPath'; python -m uvicorn main:app --host 127.0.0.1 --port $BackendPort"
)

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$frontendPath'; `$env:VITE_API_URL='$ApiUrl'; npm run dev:local"
)

Write-Host "Backend running at http://127.0.0.1:$BackendPort"
Write-Host "Frontend running at http://127.0.0.1:$FrontendPort"
Write-Host "Started in separate PowerShell windows."
