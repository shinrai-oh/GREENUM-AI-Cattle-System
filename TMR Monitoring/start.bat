@echo off
chcp 65001 >nul
title TMR 饲料配比智能监测系统

set "ROOT=%~dp0"
set "NODE=%ROOT%node-v20.17.0-win-x64\node.exe"
set "SERVER=%ROOT%server"

echo ============================================
echo  TMR 饲料配比智能监测系统
echo ============================================
echo.
echo 正在启动后端服务...
cd /d "%SERVER%"
"%NODE%" index.js

pause
