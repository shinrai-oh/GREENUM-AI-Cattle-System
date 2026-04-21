@echo off
chcp 65001 >nul
echo ========================================
echo    牛群监控系统 - Windows 停止脚本
echo ========================================
echo.

:: 设置颜色
color 0C

echo [INFO] 正在停止牛群监控系统...
echo.

:: 停止 Docker Compose 服务
echo [1/3] 停止 Docker 容器...
docker-compose down

if %errorLevel% neq 0 (
    echo [ERROR] 停止容器时出现错误
    pause
    exit /b 1
)

echo [OK] 容器已停止

:: 可选：清理未使用的资源
set /p cleanup="是否清理未使用的 Docker 资源? (y/n): "
if /i "%cleanup%"=="y" (
    echo [2/3] 清理 Docker 资源...
    docker system prune -f
    echo [OK] 资源清理完成
) else (
    echo [2/3] 跳过资源清理
)

:: 显示状态
echo [3/3] 检查服务状态...
docker-compose ps

echo.
echo ========================================
echo           系统已停止
echo ========================================
echo.
echo 要重新启动系统，请运行: start-windows.bat
echo 或者运行: docker-compose up -d
echo.
pause