# 肉牛养殖监控系统

一个基于Web的肉牛养殖监控系统，集成视频监控与数据统计分析功能。

## 系统架构

- **后端**: Python Flask API
- **前端**: Vue.js 3 + JavaScript + ECharts
- **数据库**: MySQL 8.0
- **部署**: Docker + Docker Compose
- **环境管理**: Miniconda

## 功能特性

### 视频监控
- 支持16个摄像头的RTSP视频流实时播放
- 自动读取和显示各养牛厂摄像头数据
- 实时视频流监控界面

### 数据管理与统计
- 牛只行为数据统计（采食时间、站立时间、卧躺时间）
- 数据管理页面展示
- 基于ECharts的数据可视化图表

### 系统特点
- Docker容器化部署
- 独立本地服务器部署
- 无需SSL证书和CI/CD
- 完整的环境隔离

## 快速开始

### 环境要求

- Ubuntu 18.04+
- Docker 20.10+
- Docker Compose 1.29+
- Miniconda 4.10+

### 部署步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd cattle-monitoring
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **访问系统**
- 前端界面: http://localhost
- 后端API: http://localhost:5000
- MySQL数据库: localhost:3306

### 默认账户信息

- **MySQL Root**: root / cattle123
- **MySQL用户**: cattle_user / cattle_pass
- **数据库名**: cattle_monitoring

## 项目结构

```
cattle-monitoring/
├── docker-compose.yml          # Docker编排配置
├── README.md                   # 项目说明文档
├── backend/                    # 后端Python代码
│   ├── Dockerfile             # 后端Docker配置
│   ├── app.py                 # Flask应用主文件
│   ├── models.py              # 数据库模型
│   ├── routes/                # API路由
│   ├── requirements.txt       # Python依赖
│   └── environment.yml        # Conda环境配置
├── frontend/                   # 前端Vue代码
│   ├── Dockerfile             # 前端Docker配置
│   ├── package.json           # Node.js依赖
│   ├── src/                   # Vue源代码
│   └── public/                # 静态资源
├── database/                   # 数据库配置
│   └── init.sql               # 数据库初始化脚本
└── docs/                      # 部署文档
    ├── deployment.md          # 部署指南
    └── api.md                 # API文档
```

## 开发指南

详细的开发和部署指南请参考 `docs/` 目录下的文档。

## 技术支持

如有问题，请查看部署文档或提交Issue。