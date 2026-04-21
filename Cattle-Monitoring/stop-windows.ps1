# 牛群监控系统 - Windows PowerShell 停止脚本

param(
    [switch]$Force,
    [switch]$Cleanup,
    [switch]$Quiet
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 颜色定义
$ErrorColor = "Red"
$SuccessColor = "Green"
$InfoColor = "Cyan"
$WarningColor = "Yellow"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Stop-CattleMonitoringSystem {
    Write-ColorOutput "========================================" $InfoColor
    Write-ColorOutput "    牛群监控系统 - Windows 停止脚本" $InfoColor
    Write-ColorOutput "========================================" $InfoColor
    Write-Host ""

    Write-ColorOutput "[INFO] 正在停止牛群监控系统..." $InfoColor
    Write-Host ""

    # 停止 Docker Compose 服务
    Write-ColorOutput "[1/4] 停止 Docker 容器..." $InfoColor
    
    function Invoke-Compose {
        param([string[]]$ComposeArgs)
        $v2 = $false
        try { docker compose version 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $v2 = $true } } catch {}
        if ($v2) { & docker compose @ComposeArgs } else { & docker-compose @ComposeArgs }
    }

    if ($Force) {
        # 强制停止
        Invoke-Compose @('kill') 2>$null | Out-Null
        Invoke-Compose @('down','--remove-orphans') 2>$null | Out-Null
    } else {
        # 优雅停止
        Invoke-Compose @('down') 2>$null | Out-Null
    }

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "[OK] 容器已停止" $SuccessColor
    } else {
        Write-ColorOutput "[ERROR] 停止容器时出现错误" $ErrorColor
        if (-not $Force) {
            Write-ColorOutput "尝试使用 -Force 参数强制停止" $WarningColor
        }
        return $false
    }

    # 检查容器状态
    Write-ColorOutput "[2/4] 验证容器状态..." $InfoColor
    try {
        $runningContainers = docker ps --filter "name=cattle" --format "table {{.Names}}\t{{.Status}}" 2>$null
        if ($runningContainers -and $runningContainers.Count -gt 1) {
            Write-ColorOutput "[WARNING] 仍有容器在运行:" $WarningColor
            $runningContainers | ForEach-Object { Write-ColorOutput "  $_" $WarningColor }
        } else {
            Write-ColorOutput "[OK] 所有相关容器已停止" $SuccessColor
        }
    }
    catch {
        Write-ColorOutput "[WARNING] 无法验证容器状态" $WarningColor
    }

    # 清理资源
    Write-ColorOutput "[3/4] 处理资源清理..." $InfoColor
    
    if ($Cleanup) {
        Write-ColorOutput "清理未使用的 Docker 资源..." $InfoColor
        docker system prune -f 2>$null | Out-Null
        docker volume prune -f 2>$null | Out-Null
        docker network prune -f 2>$null | Out-Null
        Write-ColorOutput "[OK] 资源清理完成" $SuccessColor
    } elseif (-not $Quiet) {
        $cleanupChoice = Read-Host "是否清理未使用的 Docker 资源? (y/n)"
        if ($cleanupChoice -eq "y" -or $cleanupChoice -eq "Y") {
            Write-ColorOutput "清理未使用的 Docker 资源..." $InfoColor
            docker system prune -f 2>$null | Out-Null
            docker volume prune -f 2>$null | Out-Null
            docker network prune -f 2>$null | Out-Null
            Write-ColorOutput "[OK] 资源清理完成" $SuccessColor
        } else {
            Write-ColorOutput "[SKIP] 跳过资源清理" $InfoColor
        }
    } else {
        Write-ColorOutput "[SKIP] 跳过资源清理" $InfoColor
    }

    # 显示最终状态
    Write-ColorOutput "[4/4] 显示最终状态..." $InfoColor
    try {
        $composeStatus = (Invoke-Compose @('ps') 2>$null)
        if ($composeStatus) {
            Write-ColorOutput "Docker Compose 状态:" $InfoColor
            $composeStatus | ForEach-Object { Write-ColorOutput "  $_" $InfoColor }
        }
    }
    catch {
        Write-ColorOutput "无法获取 Docker Compose 状态" $WarningColor
    }

    Write-Host ""
    Write-ColorOutput "========================================" $InfoColor
    Write-ColorOutput "           系统已停止" $SuccessColor
    Write-ColorOutput "========================================" $InfoColor
    Write-Host ""
    Write-ColorOutput "要重新启动系统，请运行:" $InfoColor
    Write-ColorOutput "  .\start-windows.ps1" $SuccessColor
    Write-ColorOutput "或者运行:" $InfoColor
    Write-ColorOutput "  docker-compose up -d" $SuccessColor
    Write-Host ""

    return $true
}

function Show-Usage {
    Write-Host "用法: .\stop-windows.ps1 [选项]"
    Write-Host ""
    Write-Host "选项:"
    Write-Host "  -Force    强制停止所有容器"
    Write-Host "  -Cleanup  自动清理未使用的 Docker 资源"
    Write-Host "  -Quiet    静默模式，减少输出"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\stop-windows.ps1                # 正常停止"
    Write-Host "  .\stop-windows.ps1 -Force         # 强制停止"
    Write-Host "  .\stop-windows.ps1 -Cleanup       # 停止并清理"
    Write-Host "  .\stop-windows.ps1 -Force -Cleanup -Quiet  # 强制停止、清理并静默"
}

# 主执行
try {
    if ($args -contains "-h" -or $args -contains "--help") {
        Show-Usage
        exit 0
    }

    $success = Stop-CattleMonitoringSystem
    
    if (-not $success) {
        exit 1
    }

    if (-not $Quiet) {
        Read-Host "按任意键退出"
    }
}
catch {
    Write-ColorOutput "停止过程中发生错误: $($_.Exception.Message)" $ErrorColor
    if (-not $Quiet) {
        Read-Host "按任意键退出"
    }
    exit 1
}
