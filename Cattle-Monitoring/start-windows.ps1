# 牛群监控系统 - Windows PowerShell 启动脚本
# 设置执行策略: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

param(
    [switch]$SkipBrowser,
    [switch]$Verbose
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
    Write-Host $Message -ForegroundColor $Color
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-DockerInstallation {
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "[OK] Docker Desktop 已安装: $dockerVersion" $SuccessColor
            return $true
        }
    }
    catch {
        Write-ColorOutput "[ERROR] Docker Desktop 未安装或未在PATH中" $ErrorColor
        return $false
    }
    return $false
}

function Test-DockerRunning {
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "[OK] Docker 服务正在运行" $SuccessColor
            return $true
        }
    }
    catch {
        Write-ColorOutput "[ERROR] Docker 服务未运行" $ErrorColor
        return $false
    }
    return $false
}

function Test-DockerCompose {
    try {
        $composeVersion = docker compose version 2>$null
        if ($LASTEXITCODE -eq 0) { Write-ColorOutput "[OK] Docker Compose V2 可用" $SuccessColor; return $true }
    } catch {}
    try {
        $composeVersion = docker-compose --version 2>$null
        if ($LASTEXITCODE -eq 0) { Write-ColorOutput "[OK] Docker Compose V1 可用: $composeVersion" $SuccessColor; return $true }
    }
    catch {
        Write-ColorOutput "[ERROR] Docker Compose 未找到" $ErrorColor
        return $false
    }
    return $false
}

function Invoke-Compose {
    param([string[]]$ComposeArgs)
    $v2 = $false
    try { docker compose version 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $v2 = $true } } catch {}
    if ($v2) { & docker compose @ComposeArgs } else { & docker-compose @ComposeArgs }
}

function Start-CattleMonitoringSystem {
    Write-ColorOutput "========================================" $InfoColor
    Write-ColorOutput "    牛群监控系统 - Windows 启动脚本" $InfoColor
    Write-ColorOutput "========================================" $InfoColor
    Write-Host ""

    # 检查管理员权限
    if (Test-AdminRights) {
        Write-ColorOutput "[INFO] 检测到管理员权限" $InfoColor
    } else {
        Write-ColorOutput "[WARNING] 建议以管理员身份运行此脚本" $WarningColor
    }
    Write-Host ""

    # 系统检查
    Write-ColorOutput "[1/6] 检查Docker Desktop..." $InfoColor
    if (-not (Test-DockerInstallation)) {
        Write-ColorOutput "请先安装 Docker Desktop for Windows" $ErrorColor
        Write-ColorOutput "下载地址: https://www.docker.com/products/docker-desktop" $InfoColor
        Read-Host "按任意键退出"
        exit 1
    }

    Write-ColorOutput "[2/6] 检查Docker服务状态..." $InfoColor
    if (-not (Test-DockerRunning)) {
        Write-ColorOutput "请启动 Docker Desktop 并等待其完全启动" $ErrorColor
        Read-Host "按任意键退出"
        exit 1
    }

    Write-ColorOutput "[3/6] 检查Docker Compose..." $InfoColor
    if (-not (Test-DockerCompose)) {
        Write-ColorOutput "Docker Compose 通常随 Docker Desktop 一起安装" $ErrorColor
        Read-Host "按任意键退出"
        exit 1
    }

    # 停止现有容器
    Write-ColorOutput "[4/6] 停止现有容器..." $InfoColor
    Invoke-Compose @('down') 2>$null | Out-Null

    # 构建并启动服务
    Write-ColorOutput "[5/6] 构建并启动服务..." $InfoColor
    Write-ColorOutput "这可能需要几分钟时间，请耐心等待..." $WarningColor
    
    if ($Verbose) { Invoke-Compose @('up','--build','-d') }
    else { Invoke-Compose @('up','--build','-d') 2>$null | Out-Null }

    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "[ERROR] 启动失败，请检查错误信息" $ErrorColor
        Write-ColorOutput "尝试运行: docker-compose up --build" $InfoColor
        Read-Host "按任意键退出"
        exit 1
    }

    # 等待服务启动
    Write-ColorOutput "[6/6] 等待服务启动..." $InfoColor
    Start-Sleep -Seconds 10

    # 显示服务状态
    Write-Host ""
    Write-ColorOutput "========================================" $InfoColor
    Write-ColorOutput "           服务状态检查" $InfoColor
    Write-ColorOutput "========================================" $InfoColor
    Invoke-Compose @('ps')

    # 显示访问信息
    Write-Host ""
    Write-ColorOutput "========================================" $InfoColor
    Write-ColorOutput "           系统访问信息" $InfoColor
    Write-ColorOutput "========================================" $InfoColor
    Write-ColorOutput "前端界面: http://localhost" $SuccessColor
    Write-ColorOutput "后端API:  http://localhost/api/v1" $SuccessColor
    Write-Host ""
    Write-ColorOutput "系统正在启动中，请稍等片刻后访问上述地址" $InfoColor
    Write-Host ""

    # 询问是否打开浏览器
    if (-not $SkipBrowser) {
        $choice = Read-Host "是否现在打开浏览器? (y/n)"
        if ($choice -eq "y" -or $choice -eq "Y") {
            Start-Process "http://localhost"
        }
    }

    Write-Host ""
    Write-ColorOutput "要停止系统，请运行: docker compose down" $InfoColor
    Write-ColorOutput "要查看日志，请运行: docker compose logs -f" $InfoColor
    Write-Host ""
    
    if (-not $SkipBrowser) {
        Read-Host "按任意键退出"
    }
}

# 主执行
try {
    Start-CattleMonitoringSystem
}
catch {
    Write-ColorOutput "发生错误: $($_.Exception.Message)" $ErrorColor
    Read-Host "按任意键退出"
    exit 1
}
