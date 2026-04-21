# 🐄 牛群监控系统 - Windows 快速指南

## 🚀 一键启动

### 方法一：双击运行（最简单）
1. 双击 `start-windows.bat` 文件
2. 等待系统启动完成
3. 在浏览器中访问 http://localhost

### 方法二：PowerShell（推荐）
1. 右键点击 `start-windows.ps1` → "使用 PowerShell 运行"
2. 或者在 PowerShell 中运行：
   ```powershell
   .\start-windows.ps1
   ```

## 📋 系统要求

- **Windows 10/11** (推荐最新版本)
- **4GB+ 内存** (推荐 8GB)
- **10GB+ 可用空间**
- **Docker Desktop** (脚本会自动检查并提示安装)

## 🔧 首次使用

1. **下载项目**
   ```bash
   git clone <项目地址>
   cd cattle-monitoring
   ```

2. **运行启动脚本**
   - 双击 `start-windows.bat`
   - 或运行 `start-windows.ps1`

3. **等待安装完成**
   - 首次运行需要下载 Docker 镜像
   - 大约需要 5-10 分钟

4. **访问系统**
   - 前端界面: http://localhost
   - 后端API: http://localhost/api/v1

## 🛑 停止系统

### 方法一：双击停止
- 双击 `stop-windows.bat`

### 方法二：PowerShell
```powershell
.\stop-windows.ps1
```

### 方法三：命令行
```bash
docker-compose down
```

## 🔍 故障排除

### 遇到问题？运行健康检查
```powershell
.\check-system-health.ps1
```

### 常见问题

#### Docker Desktop 未安装
- 脚本会提示下载地址
- 安装后重启计算机

#### 端口被占用
- 关闭占用 80 端口的程序
- 或修改 `docker-compose.yml` 中的端口

#### 内存不足
- 关闭其他程序
- 在 Docker Desktop 设置中增加内存分配

## 📁 重要文件

- `start-windows.bat` - 一键启动脚本（批处理）
- `start-windows.ps1` - 一键启动脚本（PowerShell）
- `stop-windows.bat` - 停止脚本（批处理）
- `stop-windows.ps1` - 停止脚本（PowerShell）
- `check-system-health.ps1` - 健康检查脚本
- `WINDOWS_SETUP.md` - 详细安装指南
- `.env.windows` - 环境配置模板

## 🆘 需要帮助？

1. 查看 `WINDOWS_SETUP.md` 详细指南
2. 运行 `check-system-health.ps1` 诊断问题
3. 查看 Docker Desktop 日志
4. 联系技术支持

## 🎯 快速命令

```bash
# 启动系统
.\start-windows.ps1

# 停止系统
.\stop-windows.ps1

# 健康检查
.\check-system-health.ps1

# 查看日志
docker-compose logs -f

# 重启系统
docker-compose restart
```

---

**提示**: 首次使用建议阅读 `WINDOWS_SETUP.md` 获取详细信息！