# Docker Desktop Installation Script for Windows
# Run as Administrator

param(
    [switch]$AutoInstall
)

Write-Host "=== Docker Desktop Installation Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "WARNING: This script should be run as Administrator for best results." -ForegroundColor Yellow
    Write-Host "Some features may not work properly without admin rights." -ForegroundColor Yellow
    Write-Host ""
}

# Check if Docker is already installed
Write-Host "Checking if Docker is already installed..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Docker is already installed: $dockerVersion" -ForegroundColor Green
        Write-Host "Checking if Docker Desktop is running..." -ForegroundColor Yellow
        
        $dockerDesktop = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
        if ($dockerDesktop) {
            Write-Host "Docker Desktop is running!" -ForegroundColor Green
            Write-Host "You can now run the cattle monitoring system." -ForegroundColor Green
            if (-not $AutoInstall) { Read-Host "Press Enter to continue" }
            return
        } else {
            Write-Host "Docker Desktop is not running. Please start Docker Desktop manually." -ForegroundColor Yellow
            Write-Host "Look for Docker Desktop in your Start menu or system tray." -ForegroundColor Yellow
            if (-not $AutoInstall) { Read-Host "Press Enter to continue" }
            return
        }
    }
} catch {
    Write-Host "Docker is not installed." -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Installing Docker Desktop ===" -ForegroundColor Cyan

# Ensure required Windows features for Docker Desktop (WSL2/Virtualization)
try {
    Write-Host "Checking and enabling required Windows features (WSL2/VM Platform)..." -ForegroundColor Yellow
    $wsl = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
    $vm = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
    $needEnable = $false
    if ($wsl.State -ne 'Enabled') { Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart -All | Out-Null; $needEnable = $true }
    if ($vm.State -ne 'Enabled') { Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart -All | Out-Null; $needEnable = $true }
    if ($needEnable) {
        Write-Host "Windows features updated. A restart may be required." -ForegroundColor Yellow
        if ($AutoInstall) {
            Write-Host "System will restart in 5 seconds to finish enabling WSL2..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
            shutdown /r /t 0
            exit 0
        } else {
            Write-Host "Please restart your computer, then re-run this installer." -ForegroundColor Yellow
            Read-Host "Press Enter to exit"
            exit 0
        }
    }
} catch {
    Write-Host "Failed to verify/enable Windows features (WSL2/VM). Proceeding anyway." -ForegroundColor Yellow
}

# Download URL for Docker Desktop
$dockerUrl = "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
$installerPath = "$env:TEMP\DockerDesktopInstaller.exe"

Write-Host "Downloading Docker Desktop installer..." -ForegroundColor Yellow
Write-Host "This may take a few minutes depending on your internet connection." -ForegroundColor Yellow

try {
    # Download Docker Desktop installer
    Invoke-WebRequest -Uri $dockerUrl -OutFile $installerPath -UseBasicParsing
    Write-Host "Download completed!" -ForegroundColor Green
} catch {
    Write-Host "Failed to download Docker Desktop installer." -ForegroundColor Red
    Write-Host "Please download manually from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    if (-not $AutoInstall) { Read-Host "Press Enter to continue" }
    return
}

Write-Host ""
Write-Host "Starting Docker Desktop installation..." -ForegroundColor Yellow
Write-Host "The installer will open in a new window." -ForegroundColor Yellow
Write-Host "Please follow the installation wizard." -ForegroundColor Yellow

try {
    # Start the installer
    if ($AutoInstall) {
        Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet" -Wait
    } else {
        Start-Process -FilePath $installerPath -Wait
    }
    
    Write-Host ""
    Write-Host "Installation completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: After installation:" -ForegroundColor Yellow
    Write-Host "1. Docker Desktop will start automatically" -ForegroundColor White
    Write-Host "2. You may need to restart your computer" -ForegroundColor White
    Write-Host "3. Accept the Docker Desktop license agreement" -ForegroundColor White
    Write-Host "4. Wait for Docker Desktop to finish starting (this may take a few minutes)" -ForegroundColor White
    Write-Host ""
    Write-Host "Once Docker Desktop is running, you can run the cattle monitoring system with:" -ForegroundColor Cyan
    Write-Host "   .\start-windows.ps1" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "Installation failed or was cancelled." -ForegroundColor Red
    Write-Host "Please try installing manually from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
}

# Clean up
if (Test-Path $installerPath) {
    Remove-Item $installerPath -Force
}

Write-Host ""
if (-not $AutoInstall) { Read-Host "Press Enter to continue" }
