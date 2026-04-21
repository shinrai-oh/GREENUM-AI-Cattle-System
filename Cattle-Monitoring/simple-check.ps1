# Simple System Check for Cattle Monitoring System
param(
    [switch]$Detailed
)

Write-Host "=== Cattle Monitoring System - Health Check ===" -ForegroundColor Cyan
Write-Host ""

# Check Windows Version
Write-Host "1. Checking Windows Version..." -ForegroundColor Yellow
$osInfo = Get-WmiObject -Class Win32_OperatingSystem
Write-Host "   OS: $($osInfo.Caption)" -ForegroundColor Green
Write-Host "   Version: $($osInfo.Version)" -ForegroundColor Green

# Check if Hyper-V is enabled
Write-Host ""
Write-Host "2. Checking Hyper-V..." -ForegroundColor Yellow
try {
    $hyperv = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All
    if ($hyperv.State -eq "Enabled") {
        Write-Host "   Hyper-V: Enabled" -ForegroundColor Green
    } else {
        Write-Host "   Hyper-V: Disabled (Required for Docker Desktop)" -ForegroundColor Red
    }
} catch {
    Write-Host "   Hyper-V: Cannot check (may need admin rights)" -ForegroundColor Yellow
}

# Check WSL
Write-Host ""
Write-Host "3. Checking WSL..." -ForegroundColor Yellow
try {
    $wslVersion = wsl --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   WSL: Installed" -ForegroundColor Green
    } else {
        Write-Host "   WSL: Not installed (Required for Docker Desktop)" -ForegroundColor Red
    }
} catch {
    Write-Host "   WSL: Not installed (Required for Docker Desktop)" -ForegroundColor Red
}

# Check Docker
Write-Host ""
Write-Host "4. Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Docker: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "   Docker: Not installed" -ForegroundColor Red
    }
} catch {
    Write-Host "   Docker: Not installed" -ForegroundColor Red
}

# Check Docker Compose
Write-Host ""
Write-Host "5. Checking Docker Compose..." -ForegroundColor Yellow
try {
    $composeVersion = docker-compose --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Docker Compose: $composeVersion" -ForegroundColor Green
    } else {
        Write-Host "   Docker Compose: Not available" -ForegroundColor Red
    }
} catch {
    Write-Host "   Docker Compose: Not available" -ForegroundColor Red
}

# Check required ports
Write-Host ""
Write-Host "6. Checking Required Ports..." -ForegroundColor Yellow
$ports = @(80, 3306, 5001)
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($connection) {
            Write-Host "   Port ${port}: In use" -ForegroundColor Yellow
        } else {
            Write-Host "   Port ${port}: Available" -ForegroundColor Green
        }
    } catch {
        Write-Host "   Port ${port}: Available" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "To run the Cattle Monitoring System, you need:" -ForegroundColor White
Write-Host "1. Docker Desktop installed and running" -ForegroundColor White
Write-Host "2. WSL 2 enabled (for Docker Desktop)" -ForegroundColor White
Write-Host "3. Hyper-V enabled (for Docker Desktop)" -ForegroundColor White
Write-Host ""
Write-Host "Download Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan

Write-Host ""
Read-Host "Press Enter to continue"