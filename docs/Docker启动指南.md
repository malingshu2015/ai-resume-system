# Docker 启动指南

## 前置准备

1. ✅ 已安装 Docker Desktop
2. ✅ 已配置 GLM API Key（编辑 `backend/.env`）

## 启动步骤

### 1. 首次启动（会自动构建镜像）

```bash
cd /Users/robinxie/01-开发项目/AI\ 智能简历
docker-compose up -d
```

首次启动会：
- 构建前端镜像（约 2-3 分钟）
- 构建后端镜像（约 2-3 分钟）
- 启动 PostgreSQL 数据库
- 启动 Redis 缓存
- 启动前后端服务

### 2. 查看服务状态

```bash
docker-compose ps
```

应该看到所有服务都是 `Up` 状态。

### 3. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. 访问应用

- **前端应用**: http://localhost:5173
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

## 常用命令

```bash
# 停止所有服务
docker-compose stop

# 启动所有服务
docker-compose start

# 重启所有服务
docker-compose restart

# 停止并删除所有容器
docker-compose down

# 停止并删除所有容器和数据卷（⚠️ 会删除数据库数据）
docker-compose down -v

# 重新构建镜像
docker-compose build

# 重新构建并启动
docker-compose up -d --build
```

## 进入容器

```bash
# 进入后端容器
docker-compose exec backend bash

# 进入前端容器
docker-compose exec frontend sh

# 进入数据库容器
docker-compose exec postgres psql -U postgres -d ai_resume
```

## 数据库操作

```bash
# 进入后端容器
docker-compose exec backend bash

# 运行数据库迁移
alembic upgrade head

# 创建新的迁移
alembic revision --autogenerate -m "描述"
```

## 故障排查

### 端口被占用

如果端口被占用，可以修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  frontend:
    ports:
      - "5174:5173"  # 改为其他端口
```

### 服务启动失败

1. 查看日志：`docker-compose logs [service_name]`
2. 检查配置文件：`backend/.env`
3. 重新构建：`docker-compose up -d --build`

### 数据库连接失败

确保 PostgreSQL 服务已启动：
```bash
docker-compose ps postgres
```

## 开发模式

在开发模式下，代码修改会自动重载：

- **前端**: Vite 热更新
- **后端**: Uvicorn `--reload` 模式

修改代码后无需重启容器。

## 生产部署

生产环境建议：

1. 修改 `backend/.env` 中的 `SECRET_KEY`
2. 使用环境变量而非 `.env` 文件
3. 配置 HTTPS
4. 使用 Nginx 反向代理
5. 配置数据库备份策略
