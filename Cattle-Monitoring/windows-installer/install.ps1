param(
    [string]$InstallDir = "C:\\Cattle-Monitoring",
    [switch]$StartNow,
    [switch]$CreateShortcuts,
    [switch]$BackupData
)

# 简单输出函数（避免编码问题）
function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host $msg -ForegroundColor Red }

function Test-Admin {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        $p = New-Object Security.Principal.WindowsPrincipal($id)
        return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { return $false }
}

function Ensure-Dir($path) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}

function Load-LocalImages($imagesDir) {
    if (-not (Test-Path $imagesDir)) { return }
    $tars = Get-ChildItem -Path $imagesDir -Filter *.tar -File -ErrorAction SilentlyContinue
    if (-not $tars -or $tars.Count -eq 0) { return }
    Write-Info "检测到离线镜像包，开始导入: $imagesDir"
    foreach ($tar in $tars) {
        Write-Info "导入镜像: $($tar.Name)"
        docker load -i $tar.FullName
    }
}

function Ensure-Docker {
    Write-Info "[1/4] 检查 Docker 安装与运行状态"
    try {
        docker --version | Out-Null
    } catch {
        Write-Warn "未检测到 Docker Desktop，将尝试调用项目中的安装脚本"
        $installer = Join-Path $RepoRoot "install-docker.ps1"
        if (Test-Path $installer) {
            Write-Info "调用: install-docker.ps1"
            powershell -NoProfile -ExecutionPolicy Bypass -File $installer -AutoInstall
        } else {
            Write-Err "缺少 install-docker.ps1，请手动安装 Docker Desktop"
            throw "Docker not installed"
        }
    }

    # 等待 Docker 服务就绪
    $retries = 12
    while ($retries -gt 0) {
        try {
            docker info 2>$null | Out-Null
            Write-Ok "Docker 服务已就绪"
            return
        } catch {
            Start-Sleep -Seconds 5
            $retries -= 1
        }
    }
    throw "Docker 服务未就绪"
}

function Copy-Project($src, $dst) {
    Write-Info "[2/4] 复制项目到安装目录: $dst"
    Ensure-Dir $dst

    # 使用 robocopy 以提高稳定性，排除不需要的目录
    $excludeDirs = @(".git", "node_modules", "dist", ".vscode", ".idea", "logs")
    $xdArgs = $excludeDirs | ForEach-Object { "/XD`"$src\$_`"" }
    $cmd = "robocopy `"$src`" `"$dst`" *.* /E /MT:8 /R:2 /W:2 /NFL /NDL /NP " + ($xdArgs -join ' ')
    Write-Info $cmd
    cmd /c $cmd | Out-Null
    Write-Ok "复制完成"
}

function Backup-Volumes($backupRoot) {
    Write-Info "[可选] 备份数据卷到: $backupRoot"
    Ensure-Dir $backupRoot
    $dateTag = (Get-Date).ToString('yyyyMMdd_HHmmss')
    $destDir = Join-Path $backupRoot $dateTag
    Ensure-Dir $destDir

    $vols = @("mysql_data", "backend_logs")
    foreach ($v in $vols) {
        # 检查卷是否存在
        $exists = docker volume ls -q | Where-Object { $_ -eq $v }
        if ($exists) {
            $tgz = Join-Path $destDir ("$v.tar.gz")
            Write-Info "备份卷 $v -> $tgz"
            # 使用 alpine 容器打包卷内容
            docker run --rm -v ${v}:/data -v ${destDir}:/backup alpine sh -c "tar -czf /backup/$(basename $tgz) -C /data ." | Out-Null
        } else {
            Write-Warn "未找到卷: $v，跳过备份"
        }
    }
    Write-Ok "备份完成"
}

function Compose-Up($dir) {
    Write-Info "[3/4] 构建并启动容器 (Compose up)"
    Push-Location $dir
    try {
        $offlineFile = Join-Path $dir "docker-compose.offline.yml"
        $useOffline = Test-Path $offlineFile
        $args = @('up','-d')
        # 在线模式：需要构建镜像
        if (-not $useOffline) { $args = @('up','--build','-d') }

        # 兼容 Compose V1 与 V2
        $composeV1 = Get-Command docker-compose -ErrorAction SilentlyContinue
        if ($composeV1) {
            if ($useOffline) { docker-compose -f $offlineFile @args } else { docker-compose @args }
        } else {
            if ($useOffline) { docker compose -f $offlineFile @args } else { docker compose @args }
        }
        if ($LASTEXITCODE -ne 0) { throw "docker compose up 失败" }
        Write-Ok "服务已启动"
    } finally {
        Pop-Location
    }
}

function Create-Shortcut($name, $target, $args, $iconPath) {
    try {
        $shell = New-Object -ComObject WScript.Shell
        $startMenu = Join-Path $env:ProgramData "Microsoft\\Windows\\Start Menu\\Programs\\Cattle Monitoring"
        Ensure-Dir $startMenu
        $linkPath = Join-Path $startMenu ("$name.lnk")
        $shortcut = $shell.CreateShortcut($linkPath)
        $shortcut.TargetPath = $target
        if ($args) { $shortcut.Arguments = $args }
        $shortcut.WorkingDirectory = $InstallDir
        if ($iconPath -and (Test-Path $iconPath)) { $shortcut.IconLocation = $iconPath }
        $shortcut.Save()

        # 桌面快捷方式
        $desktop = [Environment]::GetFolderPath('Desktop')
        $deskLink = Join-Path $desktop ("$name.lnk")
        $shortcut2 = $shell.CreateShortcut($deskLink)
        $shortcut2.TargetPath = $target
        if ($args) { $shortcut2.Arguments = $args }
        $shortcut2.WorkingDirectory = $InstallDir
        if ($iconPath -and (Test-Path $iconPath)) { $shortcut2.IconLocation = $iconPath }
        $shortcut2.Save()
    } catch {
        Write-Warn "创建快捷方式失败: $name - $($_.Exception.Message)"
    }
}

Write-Info "开始安装 牛群监控系统 (Windows)"

# 源码根目录为脚本所在目录的上级
$RepoRoot = Split-Path -Parent $PSScriptRoot
Write-Info "源代码目录: $RepoRoot"
Write-Info "安装目录: $InstallDir"

if (-not (Test-Admin)) {
    Write-Warn "建议以管理员身份运行以避免权限问题"
}

Ensure-Docker

if ($BackupData) {
    Backup-Volumes (Join-Path $InstallDir "backup")
}

Copy-Project -src $RepoRoot -dst $InstallDir

# 可选：导入离线镜像（若存在 InstallDir\images/*.tar）
Load-LocalImages (Join-Path $InstallDir "images")

Compose-Up -dir $InstallDir

if ($CreateShortcuts) {
    Write-Info "[4/4] 创建开始菜单与桌面快捷方式"
    $psExe = (Get-Command powershell).Source
    Create-Shortcut "启动牛群监控系统" $psExe "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\start-windows.ps1`"" $null
    Create-Shortcut "停止牛群监控系统" $psExe "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\stop-windows.ps1`"" $null
    Create-Shortcut "系统健康检查"     $psExe "-NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\check-system-health.ps1`"" $null
}

if ($StartNow) {
    Write-Info "打开浏览器访问 http://localhost"
    Start-Process "http://localhost"
}

Write-Ok "安装完成。数据卷(mysql_data、backend_logs)已保留，不会在升级/重装时丢失。"
