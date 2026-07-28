param(
  [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'
$baseUrl = "http://127.0.0.1:$Port"

$health = Invoke-RestMethod -Uri "$baseUrl/health" -TimeoutSec 10
if ($health.status -ne 'ok') {
  throw "Local model is not ready: $($health | ConvertTo-Json -Compress)"
}

$body = @{
  model = 'qwen2.5-7b-instruct-q4_k_m'
  messages = @(
    @{
      role = 'system'
      content = 'You are the local AI assistant inside EdgeMind.'
    },
    @{
      role = 'user'
      content = 'Reply with exactly: EdgeMind local model connected'
    }
  )
  temperature = 0
  max_tokens = 32
  stream = $false
} | ConvertTo-Json -Depth 6

$response = Invoke-RestMethod `
  -Uri "$baseUrl/v1/chat/completions" `
  -Method Post `
  -ContentType 'application/json; charset=utf-8' `
  -Body $body `
  -TimeoutSec 120

$text = $response.choices[0].message.content
$speed = $response.timings.predicted_per_second

Write-Host 'Local model connection succeeded' -ForegroundColor Green
Write-Host "Reply: $text"
Write-Host ("Speed: {0:N1} tok/s" -f $speed)
