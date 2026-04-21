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

Write-Host "安装到: $Destination"
New-Item -ItemType Directory -Force -Path "$Destination" | Out-Null
New-Item -ItemType Directory -Force -Path "$Destination\server" | Out-Null
New-Item -ItemType Directory -Force -Path "$Destination\web\dist" | Out-Null
New-Item -ItemType Directory -Force -Path "$Destination\node" | Out-Null
New-Item -ItemType Directory -Force -Path "$Destination\tools" | Out-Null

# Copy files
Copy-Item -Recurse -Force "$PSScriptRoot\..\server\*" "$Destination\server" -Exclude @("tmr.db","tmr.db-shm","tmr.db-wal","node_modules")
Copy-Item -Recurse -Force "$PSScriptRoot\..\web\dist\*" "$Destination\web\dist"
Copy-Item -Recurse -Force "$PSScriptRoot\..\node-v20.17.0-win-x64\*" "$Destination\node"
Copy-Item -Force "$PSScriptRoot\uninstall.ps1" "$Destination\tools\uninstall.ps1"

# Install server dependencies (production-only)
Write-Host "安装后端依赖..." -ForegroundColor Cyan
& "$Destination\node\npm.cmd" install --only=prod --prefix "$Destination\server"

# Install Windows Service
Write-Host "注册 Windows 服务..." -ForegroundColor Cyan
Push-Location "$Destination\server"
& "$Destination\node\node.exe" service-install.js
Pop-Location

Write-Host "安装完成。可通过开始菜单快捷方式或浏览器访问 http://localhost:3001/" -ForegroundColor Green

# Create Start Menu shortcuts
$startMenuDir = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\TMR Monitoring"
New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null

$shell = New-Object -ComObject WScript.Shell
$shortcut1 = $shell.CreateShortcut("$startMenuDir\TMR Monitoring.lnk")
$shortcut1.TargetPath = "$env:ComSpec"  # cmd.exe
$shortcut1.Arguments = "/c start http://localhost:3001/"
$shortcut1.IconLocation = "$Destination\\server\\favicon.ico,0"
$shortcut1.Save()

$shortcut2 = $shell.CreateShortcut("$startMenuDir\卸载 TMR Monitoring.lnk")
$shortcut2.TargetPath = "$env:SystemRoot\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
$shortcut2.Arguments = "-ExecutionPolicy Bypass -File `"$Destination\\tools\\uninstall.ps1`""
$shortcut2.IconLocation = "$env:SystemRoot\\System32\\shell32.dll,131"
$shortcut2.Save()
