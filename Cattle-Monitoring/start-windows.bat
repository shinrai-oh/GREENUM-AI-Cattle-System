@echo off
chcp 65001 >nul
echo ========================================
echo    牛群监控系统 - Windows 启动脚本
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] 检测到管理员权限
) else (
    echo [WARNING] 建议以管理员身份运行此脚本
    echo.
)

:: 设置颜色
color 0A

:: 检查Docker Desktop是否安装
echo [1/6] 检查Docker Desktop...
docker --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Docker Desktop 未安装或未启动
    echo 请先安装 Docker Desktop for Windows
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo [OK] Docker Desktop 已安装

:: 检查Docker是否运行
echo [2/6] 检查Docker服务状态...
docker info >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Docker 服务未运行
    echo 请启动 Docker Desktop 并等待其完全启动
    pause
    exit /b 1
)
echo [OK] Docker 服务正在运行

:: 检查docker-compose
echo [3/6] 检查Docker Compose...
docker-compose --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Docker Compose 未找到
    echo Docker Compose 通常随 Docker Desktop 一起安装
    pause
    exit /b 1
)
echo [OK] Docker Compose 可用

:: 停止可能正在运行的容器
echo [4/6] 停止现有容器...
docker-compose down >nul 2>&1

:: 构建并启动服务
echo [5/6] 构建并启动服务...
echo 这可能需要几分钟时间，请耐心等待...
docker-compose up --build -d

if %errorLevel% neq 0 (
    echo [ERROR] 启动失败，请检查错误信息
    pause
    exit /b 1
)

:: 等待服务启动
echo [6/6] 等待服务启动...
timeout /t 10 /nobreak >nul

:: 检查服务状态
echo.
echo ========================================
echo           服务状态检查
echo ========================================
docker-compose ps

:: 显示访问信息
echo.
echo ========================================
echo           系统访问信息
echo ========================================
echo 前端界面: http://localhost
echo 后端API:  http://localhost/api/v1
echo.
echo 系统正在启动中，请稍等片刻后访问上述地址
echo.

:: 询问是否打开浏览器
set /p choice="是否现在打开浏览器? (y/n): "
if /i "%choice%"=="y" (
    start http://localhost
)

echo.
echo 要停止系统，请运行: docker-compose down
echo 要查看日志，请运行: docker-compose logs -f
echo.
pause