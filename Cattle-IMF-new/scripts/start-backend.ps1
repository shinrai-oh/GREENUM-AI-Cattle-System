Param(
  [string]$AppDir = "$PSScriptRoot\.."
)

$ErrorActionPreference = 'Stop'

# Ensure working directory is backend
$backendDir = Join-Path $AppDir 'backend'
$nodeExe = Join-Path $AppDir 'node' 'node.exe'
$serverJs = Join-Path $backendDir 'dist' 'server.js'

if (!(Test-Path $nodeExe)) { throw "未找到 Node 运行时: $nodeExe" }
if (!(Test-Path $serverJs)) { throw "未找到后端入口: $serverJs (请先构建 backend)" }

Write-Host "启动后端: $serverJs"
Start-Process -FilePath $nodeExe -ArgumentList "`"$serverJs`"" -WorkingDirectory $backendDir -WindowStyle Minimized

