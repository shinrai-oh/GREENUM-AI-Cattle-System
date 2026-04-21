param(
  [string]$Destination = "$env:ProgramFiles\TMRMonitoring"
)

function Ensure-Admin {
  $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "请以管理员身份运行此脚本。" -ForegroundColor Yellow
    exit 1
  }
}

Ensure-Admin

$ErrorActionPreference = 'Stop'

Write-Host "卸载 Windows 服务..." -ForegroundColor Cyan
if (Test-Path "$Destination\server\service-uninstall.js") {
  & "$Destination\node\node.exe" "$Destination\server\service-uninstall.js"
}

Start-Sleep -Seconds 2

Write-Host "删除安装目录: $Destination" -ForegroundColor Cyan
if (Test-Path $Destination) {
  Remove-Item -Recurse -Force $Destination
}

Write-Host "卸载完成。" -ForegroundColor Green

