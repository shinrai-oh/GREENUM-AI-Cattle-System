param(
    [string]$InstallDir = "C:\\Cattle-Monitoring",
    [switch]$RemoveData
)

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host $msg -ForegroundColor Red }

Write-Info "卸载 牛群监控系统 (保留数据卷)"

if (Test-Path $InstallDir) {
    Push-Location $InstallDir
    try {
        Write-Info "停止并移除容器 (不删除数据卷)"
        docker-compose down
    } finally {
        Pop-Location
    }
} else {
    Write-Warn "未找到安装目录: $InstallDir"
}

if ($RemoveData) {
    Write-Warn "将删除数据卷: mysql_data, backend_logs"
    $confirm = Read-Host "输入 YES 确认删除所有数据"
    if ($confirm -eq "YES") {
        docker volume rm mysql_data 2>$null | Out-Null
        docker volume rm backend_logs 2>$null | Out-Null
        Write-Ok "数据卷已删除"
    } else {
        Write-Warn "取消删除数据卷"
    }
}

Write-Info "移除开始菜单与桌面快捷方式"
$startMenu = Join-Path $env:ProgramData "Microsoft\\Windows\\Start Menu\\Programs\\Cattle Monitoring"
if (Test-Path $startMenu) { Remove-Item -Recurse -Force $startMenu }

$desktop = [Environment]::GetFolderPath('Desktop')
@("启动牛群监控系统.lnk","停止牛群监控系统.lnk","系统健康检查.lnk") | ForEach-Object {
    $p = Join-Path $desktop $_
    if (Test-Path $p) { Remove-Item -Force $p }
}

Write-Info "可选择删除安装目录: $InstallDir"
Write-Ok "卸载完成。若未勾选删除数据，所有历史数据仍保留。"

