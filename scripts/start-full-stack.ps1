param(
  [int]$BackendPort = 8787
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$healthUrl = "http://127.0.0.1:$BackendPort/api/health"
$startedBackend = $null

function Test-BackendReady {
  try {
    $result = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    return $result.ok -eq $true
  } catch {
    return $false
  }
}

if (-not (Test-BackendReady)) {
  $env:EDGEMIND_API_PORT = "$BackendPort"
  $startedBackend = Start-Process `
    -FilePath 'node.exe' `
    -ArgumentList @('server/index.mjs') `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -PassThru

  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 250
    if (Test-BackendReady) { break }
  }
}

if (-not (Test-BackendReady)) {
  if ($startedBackend -and -not $startedBackend.HasExited) {
    Stop-Process -Id $startedBackend.Id
  }
  throw "EdgeMind backend failed to start at $healthUrl"
}

$env:EXPO_PUBLIC_BACKEND_URL = "http://127.0.0.1:$BackendPort"
Write-Host "EdgeMind backend ready: $healthUrl"
Write-Host 'Starting Expo Web with real backend persistence...'

try {
  Push-Location $repoRoot
  & npx.cmd expo start --web
} finally {
  Pop-Location
  if ($startedBackend -and -not $startedBackend.HasExited) {
    Stop-Process -Id $startedBackend.Id
    Write-Host 'EdgeMind backend stopped.'
  }
}
