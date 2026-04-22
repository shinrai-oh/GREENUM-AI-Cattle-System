@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

echo ============================================================
echo   GREENUM AI Cattle System — 开发环境一键部署脚本
echo   适用: Windows 10/11  需要: Git + Docker Desktop
echo ============================================================
echo.

:: ── 1. 检查 Docker ────────────────────────────────────────────
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker Desktop 未运行，请先启动 Docker Desktop 再重试。
    pause
    exit /b 1
)
echo [OK] Docker 已就绪

:: ── 2. 确认工作目录 ──────────────────────────────────────────
set "ROOT=%~dp0.."
cd /d "%ROOT%"
echo [OK] 工作目录: %ROOT%

:: ── 3. 拉取最新代码 ──────────────────────────────────────────
echo.
echo [步骤 1/4] 拉取最新源代码...
git pull origin main
if %errorlevel% neq 0 (
    echo [警告] git pull 失败，继续使用本地代码
)

:: ── 4. 构建并启动所有容器 ─────────────────────────────────────
echo.
echo [步骤 2/4] 构建 Docker 镜像并启动服务（首次约需 5-10 分钟）...
docker compose up -d --build
if %errorlevel% neq 0 (
    echo [错误] docker compose up 失败，请检查 Docker Desktop 是否正常。
    pause
    exit /b 1
)

:: ── 5. 等待 MySQL 就绪 ────────────────────────────────────────
echo.
echo [步骤 3/4] 等待 MySQL 数据库就绪...
set /a tries=0
:wait_mysql
set /a tries+=1
if %tries% gtr 30 (
    echo [错误] MySQL 启动超时，请检查容器日志: docker logs cattle_mysql
    pause
    exit /b 1
)
docker exec cattle_mysql mysqladmin ping -h localhost -ucattle_user -pcattle_pass --silent >nul 2>&1
if %errorlevel% neq 0 (
    echo    等待中... [%tries%/30]
    timeout /t 5 /nobreak >nul
    goto wait_mysql
)
echo [OK] MySQL 已就绪

:: ── 6. 导入数据库 ─────────────────────────────────────────────
echo.
echo [步骤 4/4] 导入数据库数据...
set "DUMP=%ROOT%\cattle_unified_dump.sql"
if not exist "%DUMP%" (
    echo [警告] 未找到数据库备份文件 cattle_unified_dump.sql，跳过导入。
    echo         系统将以空数据库启动（后端会自动创建表结构和种子数据）。
    goto done
)

docker exec -i cattle_mysql mysql -ucattle_user -pcattle_pass cattle_unified < "%DUMP%"
if %errorlevel% neq 0 (
    echo [错误] 数据库导入失败，请手动执行:
    echo   docker exec -i cattle_mysql mysql -ucattle_user -pcattle_pass cattle_unified ^< cattle_unified_dump.sql
    pause
    exit /b 1
)
echo [OK] 数据库导入完成

:done
echo.
echo ============================================================
echo   部署完成！可通过以下地址访问：
echo.
echo   TMR 饲料配比系统    http://localhost:8083
echo   行为监控系统        http://localhost:8082
echo   IMF 肉质评估系统    http://localhost:8081
echo   统一后端 API        http://localhost:3000
echo   MySQL               localhost:3306  (cattle_user/cattle_pass)
echo ============================================================
echo.
pause
