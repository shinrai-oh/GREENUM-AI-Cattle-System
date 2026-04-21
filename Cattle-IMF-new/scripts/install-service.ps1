Param(
  [string]$AppDir = "$PSScriptRoot\..",
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

$taskName = 'CattleIMFBackend'
$psPath = (Get-Command powershell).Source
$startScript = Join-Path $AppDir 'scripts' 'start-backend.ps1'

if (!(Test-Path $startScript)) { throw "未找到启动脚本: $startScript" }

# Create a scheduled task to run at startup
$action = New-ScheduledTaskAction -Execute $psPath -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$startScript`" -AppDir `"$AppDir`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
  Write-Host "计划任务已注册: $taskName"
} catch {
  Write-Warning "注册计划任务失败: $_"
}

