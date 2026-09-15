$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dataFile = Join-Path $root 'data.json'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:8000/')

function Get-State {
  if (-not (Test-Path $dataFile)) {
    $default = [ordered]@{ profile = [ordered]@{ name = 'Rahul'; goal = 'Build muscle'; days = '4 days / week'; diet = 'Vegetarian' }; mealDone = $false; workoutHistory = @(); mealHistory = @() }
    $default | ConvertTo-Json -Depth 5 | Set-Content -Path $dataFile -Encoding UTF8
  }
  return (Get-Content $dataFile -Raw | ConvertFrom-Json)
}

function Save-State($state) {
  $state | ConvertTo-Json -Depth 8 | Set-Content -Path $dataFile -Encoding UTF8
}

function Send-Json($context, $value, $status = 200) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($value | ConvertTo-Json -Depth 8))
  $context.Response.StatusCode = $status
  $context.Response.ContentType = 'application/json'
  $context.Response.Headers.Add('Access-Control-Allow-Origin', '*')
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}

function Read-Body($context) {
  $reader = New-Object IO.StreamReader($context.Request.InputStream, $context.Request.ContentEncoding)
  return ($reader.ReadToEnd() | ConvertFrom-Json)
}

function Send-File($context, $path) {
  if (-not (Test-Path $path -PathType Leaf)) { $context.Response.StatusCode = 404; $context.Response.Close(); return }
  $types = @{ '.html' = 'text/html'; '.js' = 'text/javascript'; '.css' = 'text/css'; '.json' = 'application/json' }
  $context.Response.ContentType = $types[[IO.Path]::GetExtension($path)]
  $bytes = [IO.File]::ReadAllBytes($path)
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}

$listener.Start()
Write-Host 'Formwell running at http://127.0.0.1:8000'
while ($listener.IsListening) {
  $context = $listener.GetContext()
  $path = $context.Request.Url.AbsolutePath
  try {
    if ($path -eq '/api/state' -and $context.Request.HttpMethod -eq 'GET') { Send-Json $context (Get-State); continue }
    if ($path -eq '/api/profile' -and $context.Request.HttpMethod -eq 'PUT') {
      $state = Get-State; $body = Read-Body $context
      foreach ($key in @('name', 'goal', 'days', 'diet')) { if ($null -ne $body.$key) { $state.profile.$key = [string]$body.$key } }
      Save-State $state; Send-Json $context $state.profile; continue
    }
    if ($path -eq '/api/meals' -and $context.Request.HttpMethod -eq 'POST') {
      $state = Get-State; $body = Read-Body $context
      $state.mealDone = $true
      $state.mealHistory += [ordered]@{ date = (Get-Date -Format 'yyyy-MM-dd'); meal = [string]$body.meal }
      Save-State $state; Send-Json $context @{ saved = $true } 201; continue
    }
    if ($path -eq '/api/workouts' -and $context.Request.HttpMethod -eq 'POST') {
      $state = Get-State; $body = Read-Body $context
      $state.workoutHistory += [ordered]@{ date = (Get-Date -Format 'yyyy-MM-dd'); exercises = $body.exercises; durationMinutes = $body.durationMinutes }
      Save-State $state; Send-Json $context @{ saved = $true } 201; continue
    }
    $requested = if ($path -eq '/') { 'index.html' } else { $path.TrimStart('/') }
    Send-File $context (Join-Path $root $requested)
  } catch {
    $context.Response.StatusCode = 500; $context.Response.Close()
  }
}
