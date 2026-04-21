# ============================================================
# 绿姆山牛场AI系统 - 开机自动启动脚本
# 用途：系统重启后自动启动所有 Docker 容器服务
# ============================================================

$ProjectDir = "D:\绿姆山牛场AI系统项目"
$LogFile = "$ProjectDir\scripts\startup.log"
$MaxWaitSeconds = 120  # 最多等待 Docker 启动 120 秒

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Write-Host $line
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

# 确保日志目录存在
if (-not (Test-Path (Split-Path $LogFile))) {
    New-Item -ItemType Directory -Path (Split-Path $LogFile) -Force | Out-Null
}

Write-Log "======== 牛场AI系统自动启动开始 ========"

# ---- 1. 等待 Docker Desktop / Docker Engine 就绪 ----
Write-Log "等待 Docker Engine 启动..."
$elapsed = 0
$dockerReady = $false

while ($elapsed -lt $MaxWaitSeconds) {
    try {
        $result = & docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerReady = $true
            Write-Log "Docker Engine 已就绪 (等待 ${elapsed}s)"
            break
        }
    } catch {}
    Start-Sleep -Seconds 5
    $elapsed += 5
}

if (-not $dockerReady) {
    Write-Log "错误：Docker Engine 在 ${MaxWaitSeconds}s 内未就绪，退出。"
    exit 1
}

# ---- 2. 使用 docker compose up -d 启动所有服务 ----
Write-Log "执行 docker compose up -d ..."
Set-Location $ProjectDir

try {
    $output = & docker compose up -d 2>&1
    $output | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -eq 0) {
        Write-Log "docker compose up -d 执行成功"
    } else {
        Write-Log "警告：docker compose up -d 返回非零退出码 $LASTEXITCODE"
    }
} catch {
    Write-Log "错误：$($_.Exception.Message)"
}

# ---- 3. 等待 30 秒让服务完全启动，然后验证 ----
Write-Log "等待 30 秒让服务完全启动..."
Start-Sleep -Seconds 30

Write-Log "验证容器状态..."
$containers = & docker compose ps --format "table {{.Name}}\t{{.Status}}" 2>&1
$containers | ForEach-Object { Write-Log $_ }

# ---- 4. 检查健康状态 ----
$unhealthy = & docker ps --filter "health=unhealthy" --format "{{.Names}}" 2>&1
if ($unhealthy) {
    Write-Log "警告：以下容器不健康：$unhealthy"
} else {
    Write-Log "所有容器运行正常"
}

Write-Log "======== 牛场AI系统自动启动完成 ========"
Write-Log "访问地址："
Write-Log "  IMF 肉质评估系统:  http://localhost:8081"
Write-Log "  行为监控系统:      http://localhost:8082"
Write-Log "  TMR 饲料配比系统:  http://localhost:8083"
Write-Log "  统一后端 API:      http://localhost:3000"
