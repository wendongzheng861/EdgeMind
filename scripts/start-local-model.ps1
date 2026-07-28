param(
  [string]$ModelPath = '',
  [string]$ServerPath = 'D:\xiaolongxia\EdgeMind-local-runtime\llama-b10144-vulkan\llama-server.exe',
  [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'

if (-not $ModelPath) {
  $downloadFolder = -join @(
    [char]0x8FC5,
    [char]0x96F7,
    [char]0x4E0B,
    [char]0x8F7D
  )
  $ModelPath = Join-Path "D:\$downloadFolder" 'qwen2.5-7b-instruct-q4_k_m.gguf'
}

if (-not (Test-Path -LiteralPath $ModelPath -PathType Leaf)) {
  throw "GGUF model not found: $ModelPath"
}

if (-not (Test-Path -LiteralPath $ServerPath -PathType Leaf)) {
  throw "llama-server not found: $ServerPath"
}

$healthUrl = "http://127.0.0.1:$Port/health"
try {
  $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
  if ($health.status -eq 'ok') {
    Write-Host "Local model server is already running: $healthUrl" -ForegroundColor Green
    exit 0
  }
} catch {
  # Continue when the local port is not listening.
}

Write-Host 'Loading Qwen2.5 7B Q4_K_M. Keep this window open.' -ForegroundColor Cyan
Write-Host "Model: $ModelPath"
Write-Host "API: http://127.0.0.1:$Port/v1/chat/completions"

& $ServerPath `
  --model $ModelPath `
  --alias 'qwen2.5-7b-instruct-q4_k_m' `
  --host '127.0.0.1' `
  --port $Port `
  --ctx-size 4096 `
  --parallel 1 `
  --n-gpu-layers auto `
  --flash-attn auto `
  --jinja `
  --cors-origins localhost

exit $LASTEXITCODE
