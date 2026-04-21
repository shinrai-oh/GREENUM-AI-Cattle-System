Param(
  [string]$TaskName = 'CattleIMFBackend'
)

$ErrorActionPreference = 'SilentlyContinue'

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
Write-Host "已移除计划任务: $TaskName"

