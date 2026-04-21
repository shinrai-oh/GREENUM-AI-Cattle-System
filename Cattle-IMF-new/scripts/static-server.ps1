Param(
  [string]$Root = "${PSScriptRoot}\..\frontend",
  [string]$Prefix = "http://localhost:8080/"
)

function Get-ContentType([string] $path) {
  switch ([System.IO.Path]::GetExtension($path).ToLower()) {
    ".html" { return "text/html" }
    ".js"   { return "application/javascript" }
    ".css"  { return "text/css" }
    ".json" { return "application/json" }
    ".png"  { return "image/png" }
    ".jpg"  { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".svg"  { return "image/svg+xml" }
    default { return "application/octet-stream" }
  }
}

Write-Host "Serving $Root at $Prefix"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Prefix)
$listener.Start()

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $localPath = $request.Url.LocalPath
    if ($localPath -eq "/") { $localPath = "/index.html" }
    $filePath = Join-Path $Root ($localPath.TrimStart("/"))
    if (Test-Path $filePath) {
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = Get-ContentType $filePath
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("Not Found")
      $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
  } catch {
    Start-Sleep -Milliseconds 50
  }
}

