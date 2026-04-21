# Cattle-IMF Windows 一键安装包制作指引

本指引说明如何将系统打包为 Windows 10+ 可直接安装的离线安装包，包含完整前后端、SQLite 数据库与示例数据。

## 产物结构

安装包将安装至 `C:\Program Files\Cattle-IMF`，包含：
- `backend\dist`：后端编译后 JS 代码
- `backend\node_modules`：后端依赖（包含 Prisma 引擎）
- `backend\prisma\dev.db`：SQLite 数据库与数据
- `backend\.env`：后端配置（默认 `PORT=3000`，`AUTO_SEED=true`）
- `frontend\`：前端静态文件
- `node\`：便携式 Node.js 运行时（Windows x64）
- `scripts\`：启动/注册脚本（计划任务）

安装完成后将：
- 添加防火墙入站规则允许 `TCP 3000`
- 注册计划任务 `CattleIMFBackend`，随系统启动自动运行后端
- 立即启动后端并创建开始菜单快捷方式（打开 `http://localhost:3000/#/login`）

## 准备环境

1) 安装 Node.js（用于构建阶段；安装包内会携带便携式运行时）
2) 安装 Inno Setup Compiler（用于编译 `.iss` 安装脚本）

## 构建步骤

在仓库根目录执行：

1. 安装依赖并编译后端
   - `cd backend`
   - `npm ci`
   - `npm run build`（生成 `backend/dist`）
   - `npx prisma generate`（确保 Prisma Client 就绪）
   - 确认 `backend/node_modules/@prisma/*` 存在

2. 预置数据库（可选）
   - 确认 `backend/prisma/dev.db` 存在且包含示例数据
   - 如需重新生成数据：设置 `backend/.env` 中 `AUTO_SEED=true`，首次运行服务会自动导入示例数据

3. 准备便携式 Node 运行时
   - 将官方 Node Windows x64 发行版（例如 `node-v18.x-win-x64`）解压到 `vendor/node/`
   - 该目录应包含 `node.exe` 等文件

4. 编译安装包
   - 使用 Inno Setup 打开 `installer/Cattle-IMF.iss`
   - 编译生成 `Cattle-IMF-Setup.exe`

## 安装与运行

1. 以管理员身份运行 `Cattle-IMF-Setup.exe`
2. 安装结束后，系统将：
   - 自动注册计划任务并启动后端（端口 `3000`）
   - 前端由后端统一托管（同端口）
3. 打开开始菜单快捷方式“Cattle-IMF 控制台”，或直接访问 `http://localhost:3000/#/login`

## 卸载与清理

通过“程序和功能”卸载，安装包将：
- 移除计划任务 `CattleIMFBackend`
- 删除安装目录

## 备注与可选项

- 端口与自动导入开关可在 `backend/.env` 中调整：
  - `PORT`（默认 `3000`）
  - `AUTO_SEED`（默认 `true`，若数据库已含数据则不会重复导入）
- 若需作为 Windows 服务而非计划任务，可替换为 NSSM 或 SC 创建服务；计划任务方案更简单，且已设置正确工作目录。
- 如需将前端与 API 域名/端口变更，可保持前后端同源以避免跨域；当前实现下前端由后端统一托管。

