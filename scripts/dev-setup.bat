@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1

echo ============================================================
echo   GREENUM AI Cattle System  开发环境一键部署脚本
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
    echo [错误] MySQL 启动超时，请检查: docker logs cattle_mysql
    pause
    exit /b 1
)
docker exec cattle_mysql mysqladmin ping -h localhost -uroot -pcattle_root_123 --silent >nul 2>&1
if %errorlevel% neq 0 (
    echo    等待中... [%tries%/30]
    timeout /t 5 /nobreak >nul
    goto wait_mysql
)
echo [OK] MySQL 已就绪

:: ── 6. 导入数据库（避免 Windows 编码问题：先 cp 进容器再导入）──
echo.
echo [步骤 4/4] 导入数据库数据...
set "DUMP=%ROOT%\cattle_unified_dump.sql"
if not exist "%DUMP%" (
    echo [警告] 未找到 cattle_unified_dump.sql，跳过导入。
    echo         后端将自动建表并写入种子数据。
    goto done
)

echo    复制 dump 文件进容器（规避 Windows 编码转换）...
docker cp "%DUMP%" cattle_mysql:/tmp/cattle_unified_dump.sql
if %errorlevel% neq 0 (
    echo [错误] docker cp 失败
    pause
    exit /b 1
)

echo    执行导入...
docker exec cattle_mysql bash -c "mysql --default-character-set=utf8mb4 -uroot -pcattle_root_123 cattle_unified < /tmp/cattle_unified_dump.sql && rm /tmp/cattle_unified_dump.sql"
if %errorlevel% neq 0 (
    echo [错误] 数据库导入失败，请查看上方错误信息。
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
echo   MySQL               localhost:3306  (root / cattle_root_123)
echo ============================================================
echo.
pause
