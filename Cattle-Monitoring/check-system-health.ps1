# 牛群监控系统 - Windows 系统健康检查脚本
# 运行此脚本来诊断系统问题和检查环境配置

param(
    [switch]$Detailed,
    [switch]$Fix,
    [switch]$Export
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
        [string]$Color = "White",
        [string]$Status = ""
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($Status) {
        Write-Host "[$timestamp] [$Status] $Message" -ForegroundColor $Color
    } else {
        Write-Host "[$timestamp] $Message" -ForegroundColor $Color
    }
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-SystemRequirements {
    Write-ColorOutput "检查系统要求..." $InfoColor "INFO"
    
    # 检查操作系统版本
    $osVersion = [System.Environment]::OSVersion.Version
    $isWindows10OrLater = $osVersion.Major -ge 10
    
    if ($isWindows10OrLater) {
        Write-ColorOutput "操作系统: Windows $($osVersion.Major).$($osVersion.Minor) ✓" $SuccessColor "OK"
    } else {
        Write-ColorOutput "操作系统版本过低，需要 Windows 10 或更高版本" $ErrorColor "ERROR"
        return $false
    }
    
    # 检查内存
    $totalMemory = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    if ($totalMemory -ge 4) {
        Write-ColorOutput "系统内存: ${totalMemory}GB ✓" $SuccessColor "OK"
    } else {
        Write-ColorOutput "系统内存不足: ${totalMemory}GB (推荐至少 4GB)" $WarningColor "WARNING"
    }
    
    # 检查可用磁盘空间
    $freeSpace = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
    if ($freeSpace -ge 10) {
        Write-ColorOutput "可用磁盘空间: ${freeSpace}GB ✓" $SuccessColor "OK"
    } else {
        Write-ColorOutput "磁盘空间不足: ${freeSpace}GB (推荐至少 10GB)" $WarningColor "WARNING"
    }
    
    return $true
}

function Test-DockerInstallation {
    Write-ColorOutput "检查 Docker 安装..." $InfoColor "INFO"
    
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Docker 版本: $dockerVersion ✓" $SuccessColor "OK"
            
            # 检查 Docker Compose
            $composeVersion = docker-compose --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "Docker Compose 版本: $composeVersion ✓" $SuccessColor "OK"
            } else {
                Write-ColorOutput "Docker Compose 未找到" $ErrorColor "ERROR"
                return $false
            }
            
            return $true
        }
    }
    catch {
        Write-ColorOutput "Docker 未安装或未在 PATH 中" $ErrorColor "ERROR"
        return $false
    }
    return $false
}

function Test-DockerService {
    Write-ColorOutput "检查 Docker 服务状态..." $InfoColor "INFO"
    
    try {
        docker info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Docker 服务正在运行 ✓" $SuccessColor "OK"
            
            # 获取 Docker 资源信息
            if ($Detailed) {
                $dockerInfo = docker system info --format "{{json .}}" | ConvertFrom-Json
                Write-ColorOutput "Docker 内存限制: $($dockerInfo.MemTotal / 1GB)GB" $InfoColor "INFO"
                Write-ColorOutput "Docker CPU 数量: $($dockerInfo.NCPU)" $InfoColor "INFO"
            }
            
            return $true
        }
    }
    catch {
        Write-ColorOutput "Docker 服务未运行" $ErrorColor "ERROR"
        return $false
    }
    return $false
}

function Test-NetworkPorts {
    Write-ColorOutput "检查网络端口..." $InfoColor "INFO"
    
    $ports = @(80, 3306, 5001)
    $portIssues = @()
    
    foreach ($port in $ports) {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-ColorOutput "端口 $port 已被占用" $WarningColor "WARNING"
            $portIssues += $port
        } else {
            Write-ColorOutput "端口 $port 可用 ✓" $SuccessColor "OK"
        }
    }
    
    if ($portIssues.Count -gt 0 -and $Detailed) {
        Write-ColorOutput "检查占用端口的进程..." $InfoColor "INFO"
        foreach ($port in $portIssues) {
            $processes = netstat -ano | Select-String ":$port "
            if ($processes) {
                Write-ColorOutput "端口 $port 被以下进程占用:" $InfoColor "INFO"
                $processes | ForEach-Object { Write-ColorOutput "  $_" $InfoColor }
            }
        }
    }
    
    return $portIssues.Count -eq 0
}

function Test-ProjectFiles {
    Write-ColorOutput "检查项目文件..." $InfoColor "INFO"
    
    $requiredFiles = @(
        "docker-compose.yml",
        "backend/Dockerfile",
        "frontend/Dockerfile",
        "database/init.sql"
    )
    
    $missingFiles = @()
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-ColorOutput "文件存在: $file ✓" $SuccessColor "OK"
        } else {
            Write-ColorOutput "文件缺失: $file" $ErrorColor "ERROR"
            $missingFiles += $file
        }
    }
    
    return $missingFiles.Count -eq 0
}

function Test-DockerContainers {
    Write-ColorOutput "检查 Docker 容器状态..." $InfoColor "INFO"
    
    try {
        $containers = docker-compose ps --format json | ConvertFrom-Json
        
        if ($containers) {
            foreach ($container in $containers) {
                $status = $container.State
                $name = $container.Name
                
                if ($status -eq "running") {
                    Write-ColorOutput "容器 $name: $status ✓" $SuccessColor "OK"
                } else {
                    Write-ColorOutput "容器 $name: $status" $WarningColor "WARNING"
                }
            }
        } else {
            Write-ColorOutput "没有运行的容器" $InfoColor "INFO"
        }
        
        return $true
    }
    catch {
        Write-ColorOutput "无法获取容器状态" $WarningColor "WARNING"
        return $false
    }
}

function Test-ServiceHealth {
    Write-ColorOutput "检查服务健康状态..." $InfoColor "INFO"
    
    # 检查前端
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost" -TimeoutSec 10 -UseBasicParsing
        if ($frontendResponse.StatusCode -eq 200) {
            Write-ColorOutput "前端服务: 正常 ✓" $SuccessColor "OK"
        } else {
            Write-ColorOutput "前端服务: 异常 (状态码: $($frontendResponse.StatusCode))" $WarningColor "WARNING"
        }
    }
    catch {
        Write-ColorOutput "前端服务: 无法访问" $WarningColor "WARNING"
    }
    
    # 检查后端 API
    try {
        $backendResponse = Invoke-WebRequest -Uri "http://localhost/api/v1/farms" -TimeoutSec 10 -UseBasicParsing
        if ($backendResponse.StatusCode -eq 200) {
            Write-ColorOutput "后端 API: 正常 ✓" $SuccessColor "OK"
        } else {
            Write-ColorOutput "后端 API: 异常 (状态码: $($backendResponse.StatusCode))" $WarningColor "WARNING"
        }
    }
    catch {
        Write-ColorOutput "后端 API: 无法访问" $WarningColor "WARNING"
    }
}

function Get-SystemDiagnostics {
    $diagnostics = @{
        Timestamp = Get-Date
        SystemInfo = @{
            OS = [System.Environment]::OSVersion.VersionString
            Memory = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
            FreeSpace = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
            IsAdmin = Test-AdminRights
        }
        Docker = @{
            Installed = $false
            Running = $false
            Version = ""
            ComposeVersion = ""
        }
        Ports = @{
            Port80 = Test-NetConnection -ComputerName localhost -Port 80 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded
            Port3306 = Test-NetConnection -ComputerName localhost -Port 3306 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded
            Port5001 = Test-NetConnection -ComputerName localhost -Port 5001 -WarningAction SilentlyContinue | Select-Object TcpTestSucceeded
        }
    }
    
    # 检查 Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $diagnostics.Docker.Installed = $true
            $diagnostics.Docker.Version = $dockerVersion
            
            $composeVersion = docker-compose --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                $diagnostics.Docker.ComposeVersion = $composeVersion
            }
            
            docker info 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $diagnostics.Docker.Running = $true
            }
        }
    }
    catch {
        # Docker 未安装
    }
    
    return $diagnostics
}

function Repair-CommonIssues {
    Write-ColorOutput "尝试修复常见问题..." $InfoColor "INFO"
    
    # 清理 Docker 资源
    Write-ColorOutput "清理 Docker 资源..." $InfoColor "INFO"
    docker system prune -f 2>$null | Out-Null
    
    # 重启 Docker 网络
    Write-ColorOutput "重置 Docker 网络..." $InfoColor "INFO"
    docker network prune -f 2>$null | Out-Null
    
    # 停止并重启服务
    Write-ColorOutput "重启服务..." $InfoColor "INFO"
    docker-compose down 2>$null | Out-Null
    Start-Sleep -Seconds 5
    docker-compose up -d 2>$null | Out-Null
    
    Write-ColorOutput "修复操作完成" $SuccessColor "OK"
}

# 主执行函数
function Start-HealthCheck {
    Write-ColorOutput "========================================" $InfoColor
    Write-ColorOutput "    牛群监控系统 - 健康检查脚本" $InfoColor
    Write-ColorOutput "========================================" $InfoColor
    Write-Host ""
    
    $allPassed = $true
    
    # 检查管理员权限
    if (Test-AdminRights) {
        Write-ColorOutput "管理员权限: 是 ✓" $SuccessColor "OK"
    } else {
        Write-ColorOutput "管理员权限: 否 (建议以管理员身份运行)" $WarningColor "WARNING"
    }
    
    # 系统要求检查
    if (-not (Test-SystemRequirements)) {
        $allPassed = $false
    }
    
    # Docker 安装检查
    if (-not (Test-DockerInstallation)) {
        $allPassed = $false
    }
    
    # Docker 服务检查
    if (-not (Test-DockerService)) {
        $allPassed = $false
    }
    
    # 网络端口检查
    Test-NetworkPorts | Out-Null
    
    # 项目文件检查
    if (-not (Test-ProjectFiles)) {
        $allPassed = $false
    }
    
    # 容器状态检查
    Test-DockerContainers | Out-Null
    
    # 服务健康检查
    Test-ServiceHealth
    
    Write-Host ""
    Write-ColorOutput "========================================" $InfoColor
    if ($allPassed) {
        Write-ColorOutput "    健康检查完成 - 系统状态良好" $SuccessColor
    } else {
        Write-ColorOutput "    健康检查完成 - 发现问题" $WarningColor
    }
    Write-ColorOutput "========================================" $InfoColor
    
    # 导出诊断信息
    if ($Export) {
        $diagnostics = Get-SystemDiagnostics
        $exportPath = "system-diagnostics-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
        $diagnostics | ConvertTo-Json -Depth 10 | Out-File -FilePath $exportPath -Encoding UTF8
        Write-ColorOutput "诊断信息已导出到: $exportPath" $InfoColor "INFO"
    }
    
    # 自动修复
    if ($Fix -and -not $allPassed) {
        $choice = Read-Host "是否尝试自动修复问题? (y/n)"
        if ($choice -eq "y" -or $choice -eq "Y") {
            Repair-CommonIssues
        }
    }
}

# 执行健康检查
try {
    Start-HealthCheck
}
catch {
    Write-ColorOutput "健康检查过程中发生错误: $($_.Exception.Message)" $ErrorColor "ERROR"
    exit 1
}

Write-Host ""
Read-Host "按任意键退出"