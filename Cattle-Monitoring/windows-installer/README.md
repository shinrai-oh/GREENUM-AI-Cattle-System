# Windows 一键安装与数据保留说明

## 目标
- 一键安装部署整套牛群监控系统到 Windows。
 - 一键安装部署整套牛群监控系统到 Windows（自动适配 Docker Compose V1/V2）。
- 安装/升级过程保留现有数据（Docker 命名卷：`mysql_data`, `backend_logs`）。
- 安装后可通过“开始菜单/桌面快捷方式”一键启动与停止系统。

## 组成
- `windows-installer/install.ps1`：安装脚本（复制项目、检测/安装 Docker、可选导入离线镜像、构建并启动容器、创建快捷方式）。
- `windows-installer/uninstall.ps1`：卸载脚本（默认保留数据，提供可选删除数据）。
- `windows-installer/installer.iss`：Inno Setup 安装包工程脚本。

## 使用方式（脚本安装）
1. 以管理员身份打开 PowerShell。
2. 在项目根目录执行：
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\windows-installer\install.ps1 -CreateShortcuts -StartNow
   ```
   - 如需备份数据卷：加 `-BackupData` 参数，备份存放在安装目录的 `backup/时间戳/`。
   - 默认安装到 `C:\Cattle-Monitoring`，可通过 `-InstallDir` 自定义。

3. 安装完成后，开始菜单与桌面会生成以下快捷方式：
   - `启动牛群监控系统`（调用 `start-windows.ps1`）
   - `停止牛群监控系统`（调用 `stop-windows.ps1`）
   - `系统健康检查`（调用 `check-system-health.ps1`）

## 使用方式（打包安装）
1. 安装 Inno Setup（官方编译器）。
2. 打开 `windows-installer/installer.iss`，编译生成 `cattle-monitoring-setup.exe`。
3. 运行安装程序，安装完成后会自动调用 `install.ps1` 并启动系统。

> 安装包以管理员权限运行（installer.iss 已设置 `PrivilegesRequired=admin`），用于自动安装/配置 Docker Desktop 和创建快捷方式。

## 数据保留策略
- 使用 Docker 命名卷 `mysql_data`, `backend_logs` 存储 MySQL 与后台日志数据。
- `install.ps1` 与安装程序不会删除数据卷；升级/重装时数据自动保留。
- 如需备份请使用 `install.ps1 -BackupData`，或使用 Docker 自带导出命令。
- 卸载时默认保留数据卷。若需删除所有数据，请执行：
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\windows-installer\uninstall.ps1 -RemoveData
  ```

## 注意事项
- 需要 Docker Desktop；若未安装，脚本会自动调用项目内的 `install-docker.ps1` 尝试静默安装，并启用 WSL2/虚拟机平台（可能需要重启）。
- 首次启动会进行镜像构建与依赖安装，耗时与网络状况相关。
- 不要使用 `docker-compose down -v`，该命令会删除数据卷并导致数据丢失。

### 数据随安装包自动导入（MySQL）
- 安装包内包含 `database/seed_data.sql`（您当前 MySQL 的数据导出）。
- 首次在新机器安装时，MySQL 容器会自动按顺序执行：
  - `001_init.sql`（仅建库/建表/索引，不含示例数据）
  - `100_seed_data.sql`（导入您已有的业务数据）
- 若目标机器上已存在 `mysql_data` 卷（历史安装或手动保留），上述自动导入不会重复执行，原有数据将被保留。
- 如需更新安装包内的数据，请在打包前将最新导出的 SQL 覆盖到 `database/seed_data.sql`。

### 离线安装（可选）
- 在无法联网的环境，可提前准备镜像包至 `images/` 目录（与 `docker-compose.yml` 同级）。
- 支持 `*.tar` 批量导入（`docker save` 导出），安装脚本会自动检测并导入后改用 `docker-compose.offline.yml` 启动（跳过构建）。
  - 需要准备的镜像与建议标签：
    - `mysql:8.0`（官方镜像）
    - `cattle-monitoring-backend:1.0`（预构建后端镜像）
    - `cattle-monitoring-frontend:1.0`（预构建前端镜像）
  - 在联网环境构建并导出示例：
    ```powershell
    # 后端
    docker build -t cattle-monitoring-backend:1.0 -f backend/Dockerfile backend
    # 前端
    docker build -t cattle-monitoring-frontend:1.0 -f frontend/Dockerfile frontend
    # 基础镜像
    docker pull mysql:8.0

    # 导出为 tar
    mkdir images
    docker save mysql:8.0 -o images/mysql-8.0.tar
    docker save cattle-monitoring-backend:1.0 -o images/backend-1.0.tar
    docker save cattle-monitoring-frontend:1.0 -o images/frontend-1.0.tar
    ```
  - 将 `images/` 目录与项目一同打包；安装器会自动导入并使用 `docker-compose.offline.yml` 启动。
  - 离线模式同样会自动加载 `database/seed_data.sql`（与在线模式一致）。

## 常见问题
- 若浏览器无法打开，请手动访问：`http://localhost/`。
- 如遇端口占用，请检查本机已有服务（前端默认 80，后端默认 5001，开发时 Vite 默认 8080）。
- 执行策略报错：请以管理员权限执行并加 `-ExecutionPolicy Bypass`。
