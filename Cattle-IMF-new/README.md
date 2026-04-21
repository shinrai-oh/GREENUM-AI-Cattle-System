# 活体肉牛超声波肉质评估系统 (V1.0)

本仓库实现基于 PRD 的前后端分离系统：前端为纯静态 SPA（HTML/CSS/JS，无需构建），后端为 Express + TypeScript + Prisma（MySQL），并提供 MySQL DDL 与种子数据脚本。

## 项目结构

- `frontend/` 前端静态站点（可用 PowerShell 简易静态服务器预览）
- `backend/` 后端 Express + TypeScript + Prisma 代码
- `db/schema.sql` MySQL 建表脚本（含函数 `calculate_mock_grade`）
- `db/seed.sql` MySQL 种子数据脚本（插入用户、分组、牛只、测量记录）
- `scripts/static-server.ps1` 简易静态服务器（PowerShell版）

## 前端预览

在 Windows PowerShell 中运行：

```
# 进入仓库根目录
cd d:\Cattle-IMF
# 启动静态服务器（默认 http://localhost:8080/ ）
./scripts/static-server.ps1
```

打开浏览器访问 `http://localhost:8080/`。

前端默认使用“Mock API”模式（`frontend/api.js` 中 `USE_MOCK = true`），无需后端即可体验主要界面与流程。

## 后端运行（需要 Node.js 与 MySQL）

1. 安装 Node.js (v18+) 与 MySQL (5.7+/8.0+)
2. 配置数据库并创建：
   - 在 MySQL 中执行 `db/schema.sql` 创建表与函数
   - 可选：执行 `db/seed.sql` 导入基础种子数据
3. 在 `backend/` 目录执行：

```
cd backend
npm install
# 配置 .env 中的 DATABASE_URL，如：
# DATABASE_URL="mysql://user:pass@localhost:3306/cattle_imf"

npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

- 后端默认监听 `http://localhost:3000/`
- 前端若改为使用真实 API，可在 `frontend/api.js` 将 `USE_MOCK` 改为 `false`

## API 概览

- `POST /api/v1/auth/login` 获取 Token（示例内置用户 `admin/admin123`）
- `GET /api/v1/cattle` 列表（分页/搜索）
- `POST /api/v1/cattle` 新增牛只
- `GET /api/v1/cattle/{earTagId}` 详情
- `PUT /api/v1/cattle/{earTagId}` 更新
- `GET /api/v1/cattle/{earTagId}/measurements` 历史测量
- `POST /api/v1/measurements` 新增测量（后端自动计算 `simulated_grade`）
- `GET /api/v1/reports/group?groupIds=1,2` 分组平均值报表

## 说明

- 模拟评级逻辑统一位于后端 `src/mockGrade.ts` 与 SQL 函数 `calculate_mock_grade`，与 PRD 规则一致。
- 前端图表为简易 Canvas 折线图，仅用于演示；后续可替换为 Chart.js 等库。
- 若不希望使用 Prisma，可直接使用 `db/schema.sql` + SQL 查询实现后端。

