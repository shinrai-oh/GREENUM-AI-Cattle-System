# 牛群监控系统 - Windows 安装指南

## 📋 系统要求

### 最低配置要求
- **操作系统**: Windows 10 (版本 1903 或更高) 或 Windows 11
- **内存**: 4GB RAM (推荐 8GB 或更多)
- **存储空间**: 至少 10GB 可用空间
- **网络**: 稳定的互联网连接

### 推荐配置
- **操作系统**: Windows 11 最新版本
- **内存**: 8GB RAM 或更多
- **存储空间**: 20GB 或更多可用空间
- **处理器**: 多核处理器

## 🚀 快速开始

### 方法一：一键启动（推荐）

1. **下载项目**
   ```bash
   git clone https://github.com/your-repo/cattle-monitoring.git
   cd cattle-monitoring
   ```

2. **运行启动脚本**
   
   **选项 A - 批处理脚本**（双击运行）
   ```
   start-windows.bat
   ```
   
   **选项 B - PowerShell 脚本**（推荐）
   ```powershell
   # 以管理员身份运行 PowerShell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   .\start-windows.ps1
   ```

3. **访问系统**
   - 前端界面: http://localhost
   - 后端API: http://localhost/api/v1

### 方法二：手动安装

如果一键启动遇到问题，请按照以下步骤手动安装：

## 📦 依赖安装

### 1. 安装 Docker Desktop

1. **下载 Docker Desktop**
   - 访问 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
   - 下载最新版本的安装程序

2. **安装 Docker Desktop**
   - 运行下载的安装程序
   - 按照安装向导完成安装
   - 重启计算机（如果需要）

3. **启动 Docker Desktop**
   - 从开始菜单启动 Docker Desktop
   - 等待 Docker 引擎完全启动（状态栏图标变为绿色）

4. **验证安装**
   ```bash
   docker --version
   docker-compose --version
   ```

### 2. 启用 WSL 2（如果需要）

如果 Docker Desktop 要求启用 WSL 2：

1. **启用 Windows 功能**
   ```powershell
   # 以管理员身份运行 PowerShell
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   ```

2. **重启计算机**

3. **安装 WSL 2 Linux 内核更新包**
   - 下载并安装 [WSL2 Linux kernel update package](https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi)

4. **设置 WSL 2 为默认版本**
   ```powershell
   wsl --set-default-version 2
   ```

## 🔧 系统配置

### 1. 配置 Docker Desktop

1. **打开 Docker Desktop 设置**
   - 右键点击系统托盘中的 Docker 图标
   - 选择 "Settings"

2. **资源配置**
   - 转到 "Resources" > "Advanced"
   - 设置内存: 至少 4GB（推荐 6GB 或更多）
   - 设置 CPU: 至少 2 核心
   - 点击 "Apply & Restart"

3. **文件共享**
   - 转到 "Resources" > "File Sharing"
   - 确保项目所在的驱动器已被共享
   - 点击 "Apply & Restart"

### 2. 环境变量配置（可选）

1. **复制环境配置文件**
   ```bash
   copy .env.windows .env
   ```

2. **编辑配置文件**
   - 使用记事本或其他文本编辑器打开 `.env` 文件
   - 根据需要修改配置参数

## 🏃‍♂️ 运行系统

### 使用 Docker Compose

1. **打开命令提示符或 PowerShell**
   ```bash
   cd /path/to/cattle-monitoring
   ```

2. **启动服务**
   ```bash
   docker-compose up --build -d
   ```

3. **查看服务状态**
   ```bash
   docker-compose ps
   ```

4. **查看日志**
   ```bash
   docker-compose logs -f
   ```

## 🌐 访问系统

### 默认访问地址
- **前端界面**: http://localhost
- **后端API**: http://localhost/api/v1
- **数据库**: localhost:3306

### 默认账户信息
- **数据库用户**: cattle_user
- **数据库密码**: cattle_pass
- **数据库名**: cattle_monitoring

## 🔍 故障排除

### 常见问题

#### 1. Docker Desktop 无法启动
**解决方案**:
- 确保已启用虚拟化功能（在 BIOS 中）
- 检查 Windows 功能中的 Hyper-V 是否已启用
- 重启 Docker Desktop 服务

#### 2. 端口冲突
**错误信息**: `Port 80 is already in use`

**解决方案**:
```bash
# 查看占用端口的进程
netstat -ano | findstr :80

# 停止占用端口的服务或修改 docker-compose.yml 中的端口映射
```

#### 3. 内存不足
**错误信息**: `not enough memory`

**解决方案**:
- 增加 Docker Desktop 的内存分配
- 关闭其他不必要的应用程序
- 重启计算机释放内存

#### 4. 网络连接问题
**解决方案**:
```bash
# 重置 Docker 网络
docker network prune

# 重启 Docker Desktop
```

#### 5. 文件权限问题
**解决方案**:
- 确保 Docker Desktop 有访问项目文件夹的权限
- 在 Docker Desktop 设置中添加文件共享路径

### 健康检查脚本

运行健康检查脚本来诊断问题：
```bash
.\check-system-health.ps1
```

## 🛠 开发模式

### 启用开发模式

1. **修改环境配置**
   ```bash
   # 在 .env 文件中设置
   DEVELOPMENT_MODE=true
   HOT_RELOAD=true
   MOUNT_SOURCE_CODE=true
   ```

2. **重启服务**
   ```bash
   docker-compose down
   docker-compose up --build -d
   ```

### 调试技巧

1. **查看实时日志**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

2. **进入容器调试**
   ```bash
   docker exec -it cattle_backend bash
   docker exec -it cattle_frontend sh
   ```

## 🔄 更新系统

### 更新到最新版本

1. **停止当前服务**
   ```bash
   docker-compose down
   ```

2. **拉取最新代码**
   ```bash
   git pull origin main
   ```

3. **重新构建并启动**
   ```bash
   docker-compose up --build -d
   ```

## 🗑 卸载系统

### 完全清理

1. **停止所有服务**
   ```bash
   docker-compose down -v
   ```

2. **删除镜像**
   ```bash
   docker rmi $(docker images "cattle*" -q)
   ```

3. **清理卷和网络**
   ```bash
   docker volume prune
   docker network prune
   ```

## 📞 技术支持

如果遇到问题，请：

1. 查看本文档的故障排除部分
2. 运行健康检查脚本
3. 查看系统日志
4. 联系技术支持团队

## 📝 注意事项

- 首次启动可能需要较长时间下载 Docker 镜像
- 确保防火墙允许 Docker 访问网络
- 定期更新 Docker Desktop 到最新版本
- 在生产环境中请修改默认密码和密钥