# 肉牛养殖监控系统部署指南

本文档详细介绍了肉牛养殖监控系统的完整部署流程，包括环境准备、系统安装、配置和运维管理。

## 目录

- [系统要求](#系统要求)
- [环境准备](#环境准备)
- [快速部署](#快速部署)
- [详细部署步骤](#详细部署步骤)
- [配置说明](#配置说明)
- [运维管理](#运维管理)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 系统要求

### 硬件要求

**最低配置：**
- CPU: 4核心 2.0GHz
- 内存: 8GB RAM
- 存储: 100GB 可用空间
- 网络: 1Gbps 网络接口

**推荐配置：**
- CPU: 8核心 2.5GHz 或更高
- 内存: 16GB RAM 或更高
- 存储: 500GB SSD
- 网络: 1Gbps 网络接口
- GPU: 支持CUDA的显卡（可选，用于视频处理加速）

### 软件要求

- **操作系统**: Ubuntu 18.04 LTS 或更高版本
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 1.29 或更高版本
- **Git**: 2.17 或更高版本

### 网络要求

- 系统需要访问互联网以下载依赖包
- 摄像头需要通过RTSP协议连接到系统
- 建议使用静态IP地址
- 防火墙需要开放以下端口：
  - 80: HTTP访问
  - 5000: 后端API
  - 3306: MySQL数据库（可选，仅用于外部访问）

## 环境准备

### 1. 更新系统

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装必要的工具
sudo apt install -y curl wget git vim htop
```

### 2. 安装Docker

```bash
# 卸载旧版本Docker
sudo apt remove docker docker-engine docker.io containerd runc

# 安装Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加Docker官方APT仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 更新包索引
sudo apt update

# 安装Docker Engine
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组
sudo usermod -aG docker $USER

# 验证Docker安装
docker --version
```

### 3. 安装Docker Compose

```bash
# 下载Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker-compose --version
```

### 4. 配置系统参数

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 配置内核参数
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 快速部署

如果您已经准备好了环境，可以使用以下命令快速部署系统：

```bash
# 1. 克隆项目
git clone <repository-url>
cd cattle-monitoring

# 2. 启动所有服务
docker-compose up -d

# 3. 检查服务状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

部署完成后，您可以通过以下地址访问系统：
- 前端界面: http://localhost
- 后端API: http://localhost:5000

## 详细部署步骤

### 1. 获取源代码

```bash
# 克隆项目到本地
git clone <repository-url>
cd cattle-monitoring

# 查看项目结构
ls -la
```

### 2. 配置环境变量

创建环境变量文件：

```bash
# 创建后端环境变量文件
cat > backend/.env << EOF
FLASK_ENV=production
SECRET_KEY=your-secret-key-here
DATABASE_URL=mysql+pymysql://cattle_user:cattle_pass@mysql:3306/cattle_monitoring
LOG_LEVEL=INFO
EOF

# 创建数据库环境变量文件
cat > .env << EOF
MYSQL_ROOT_PASSWORD=cattle123
MYSQL_DATABASE=cattle_monitoring
MYSQL_USER=cattle_user
MYSQL_PASSWORD=cattle_pass
EOF
```

### 3. 构建和启动服务

```bash
# 构建所有服务
docker-compose build

# 启动服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 4. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 查看服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -u cattle_user -p cattle_monitoring

# 测试后端API
curl http://localhost:5000/health

# 测试前端访问
curl http://localhost
```

### 5. 初始化数据

系统启动后，MySQL数据库会自动执行初始化脚本，创建必要的表结构和示例数据。您可以通过以下方式验证：

```bash
# 连接到数据库
docker-compose exec mysql mysql -u cattle_user -p cattle_monitoring

# 查看表结构
SHOW TABLES;

# 查看示例数据
SELECT * FROM farms;
SELECT * FROM cameras LIMIT 5;
```

## 配置说明

### Docker Compose配置

主要的配置文件是 `docker-compose.yml`，包含以下服务：

- **mysql**: MySQL 8.0 数据库服务
- **backend**: Python Flask 后端服务
- **frontend**: Vue.js 前端服务（通过Nginx提供）

### 后端配置

后端配置主要在 `backend/config.py` 文件中，包括：

- 数据库连接配置
- Flask应用配置
- 日志配置
- CORS配置
- 视频流配置

### 前端配置

前端配置主要在以下文件中：

- `frontend/vite.config.js`: Vite构建配置
- `frontend/nginx.conf`: Nginx服务器配置
- `frontend/src/api/index.js`: API请求配置

### 数据库配置

数据库初始化脚本位于 `database/init.sql`，包含：

- 表结构定义
- 索引创建
- 示例数据插入

## 运维管理

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f backend
```

### 数据备份

```bash
# 备份数据库
docker-compose exec mysql mysqldump -u root -p cattle_monitoring > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p cattle_monitoring < backup_file.sql
```

### 日志管理

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend

# 实时查看日志
docker-compose logs -f

# 查看最近的日志
docker-compose logs --tail=100
```

### 系统监控

```bash
# 查看容器资源使用情况
docker stats

# 查看系统资源
htop

# 查看磁盘使用情况
df -h

# 查看网络连接
netstat -tulpn
```

### 更新系统

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose down
docker-compose up -d
```

## 故障排除

### 常见问题

#### 1. 容器启动失败

```bash
# 查看容器日志
docker-compose logs [service_name]

# 检查容器状态
docker-compose ps

# 重新构建容器
docker-compose build [service_name]
```

#### 2. 数据库连接失败

```bash
# 检查MySQL容器状态
docker-compose ps mysql

# 查看MySQL日志
docker-compose logs mysql

# 测试数据库连接
docker-compose exec mysql mysql -u root -p
```

#### 3. 前端无法访问

```bash
# 检查Nginx配置
docker-compose exec frontend nginx -t

# 查看前端日志
docker-compose logs frontend

# 检查端口占用
sudo netstat -tulpn | grep :80
```

#### 4. 后端API错误

```bash
# 查看后端日志
docker-compose logs backend

# 检查Python环境
docker-compose exec backend python --version

# 测试API连接
curl http://localhost:5000/health
```

#### 5. 视频流无法播放

- 检查摄像头RTSP地址是否正确
- 确认网络连接正常
- 验证摄像头状态
- 查看后端视频处理日志

### 性能问题

#### 1. 系统响应慢

```bash
# 检查系统资源
top
htop
iostat

# 检查容器资源使用
docker stats

# 优化数据库查询
# 查看慢查询日志
docker-compose exec mysql mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

#### 2. 内存使用过高

```bash
# 查看内存使用情况
free -h

# 查看容器内存使用
docker stats --no-stream

# 重启服务释放内存
docker-compose restart
```

## 性能优化

### 1. 数据库优化

```sql
-- 添加索引优化查询性能
CREATE INDEX idx_behavior_data_time ON behavior_data(start_time);
CREATE INDEX idx_daily_statistics_date ON daily_statistics(stat_date);

-- 配置MySQL参数
-- 在docker-compose.yml中添加MySQL配置
command: >
  --innodb-buffer-pool-size=1G
  --innodb-log-file-size=256M
  --max-connections=200
```

### 2. 应用优化

```bash
# 启用Gzip压缩（在nginx.conf中）
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# 配置缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 系统优化

```bash
# 调整系统参数
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65535' >> /etc/sysctl.conf
sudo sysctl -p

# 配置Docker日志轮转
# 在/etc/docker/daemon.json中添加
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 4. 监控和告警

建议集成以下监控工具：

- **Prometheus + Grafana**: 系统监控和可视化
- **ELK Stack**: 日志收集和分析
- **Alertmanager**: 告警通知

## 安全建议

### 1. 网络安全

```bash
# 配置防火墙
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 禁用不必要的服务
sudo systemctl disable apache2
sudo systemctl disable nginx
```

### 2. 数据安全

- 定期备份数据库
- 使用强密码
- 启用SSL/TLS加密
- 限制数据库访问权限

### 3. 应用安全

- 定期更新系统和依赖包
- 使用环境变量管理敏感信息
- 启用访问日志记录
- 实施访问控制

## 扩展部署

### 高可用部署

对于生产环境，建议使用以下架构：

- **负载均衡器**: Nginx/HAProxy
- **应用集群**: 多个后端实例
- **数据库集群**: MySQL主从复制
- **缓存层**: Redis集群
- **文件存储**: 分布式文件系统

### 容器编排

对于大规模部署，建议使用：

- **Kubernetes**: 容器编排平台
- **Docker Swarm**: Docker原生集群
- **Helm**: Kubernetes包管理器

## 联系支持

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查项目的GitHub Issues
3. 联系技术支持团队

---

**注意**: 本文档会根据系统更新持续维护，请定期查看最新版本。