#!/bin/bash

# AI 智能简历优化应用 - 项目初始化脚本

set -e

echo "🚀 开始初始化 AI 智能简历优化应用..."

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 初始化前端项目
echo -e "${BLUE}📦 初始化前端项目...${NC}"
cd frontend

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}创建 React + TypeScript 项目...${NC}"
    # 使用 --yes 避免交互式确认，并使用 . 进行当前目录初始化
    npm create vite@latest . -- --template react-ts --yes
    
    echo -e "${YELLOW}安装核心依赖...${NC}"
    npm install react-router-dom zustand antd @ant-design/icons axios recharts
    
    echo -e "${YELLOW}安装开发依赖...${NC}"
    npm install -D @types/node
    
    echo -e "${GREEN}✅ 前端项目初始化完成${NC}"
else
    echo -e "${YELLOW}前端项目已存在，跳过初始化${NC}"
fi

cd ..

# 2. 初始化后端项目
echo -e "${BLUE}📦 初始化后端项目...${NC}"
cd backend

if [ ! -f "requirements.txt" ]; then
    echo -e "${YELLOW}创建 Python 虚拟环境...${NC}"
    python3 -m venv venv
    
    echo -e "${YELLOW}激活虚拟环境并安装依赖...${NC}"
    source venv/bin/activate
    
    # 升级 pip
    pip install --upgrade pip

    # 创建 requirements.txt
    cat > requirements.txt << 'EOF'
# Web 框架
fastapi==0.109.0
uvicorn[standard]==0.27.0

# 数据库
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
alembic==1.13.1

# 缓存和任务队列
redis==5.0.1
celery==5.3.4

# 数据验证
pydantic==2.5.3
pydantic-settings==2.1.0

# 认证
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# 文件处理
python-multipart==0.0.6
pdfplumber==0.10.3
python-docx==1.1.0

# AI 服务
openai==1.7.2

# 工具
python-dotenv==1.0.0
EOF

    # 尝试安装依赖
    if ! pip install -r requirements.txt; then
        echo -e "${YELLOW}警告: 依赖安装失败。${NC}"
        echo -e "${YELLOW}建议运行: 'brew install libpq' 后再次尝试。${NC}"
    fi
    
    echo -e "${GREEN}✅ 后端项目初始化完成${NC}"
else
    echo -e "${YELLOW}后端项目已存在，跳过初始化${NC}"
fi

cd ..

# 3. 创建环境变量文件
echo -e "${BLUE}📝 创建环境变量文件...${NC}"

# 后端环境变量
cat > backend/.env.example << 'EOF'
# 项目配置
PROJECT_NAME="AI 智能简历优化应用"
VERSION="1.0.0"
API_V1_STR="/api/v1"

# 安全配置
SECRET_KEY="your-secret-key-here-change-in-production"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# 数据库配置
DATABASE_URL="postgresql://postgres:password@localhost:5432/ai_resume"

# Redis 配置
REDIS_URL="redis://localhost:6379/0"

# AI 配置
OPENAI_API_KEY="your-openai-api-key-here"
OPENAI_MODEL="gpt-4"

# 文件上传配置
UPLOAD_DIR="uploads"
MAX_UPLOAD_SIZE=10485760

# CORS 配置
ALLOWED_ORIGINS=["http://localhost:5173","http://localhost:3000"]
EOF

# 前端环境变量
cat > frontend/.env.example << 'EOF'
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=AI 智能简历优化应用
EOF

echo -e "${GREEN}✅ 环境变量文件创建完成${NC}"

# 4. 创建 Docker 配置
echo -e "${BLUE}🐳 创建 Docker 配置...${NC}"

# 后端 Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 创建上传目录
RUN mkdir -p uploads/resumes uploads/temp

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# 前端 Dockerfile
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 5173

# 启动命令
CMD ["npm", "run", "dev", "--", "--host"]
EOF

# Docker Compose
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_resume
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-password}@postgres:5432/ai_resume
      REDIS_URL: redis://redis:6379/0
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      SECRET_KEY: ${SECRET_KEY}
    volumes:
      - ./backend:/app
      - uploads:/app/uploads
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      VITE_API_BASE_URL: http://localhost:8000/api/v1

volumes:
  postgres_data:
  redis_data:
  uploads:
EOF

echo -e "${GREEN}✅ Docker 配置创建完成${NC}"

# 5. 创建 README
echo -e "${BLUE}📄 创建 README...${NC}"

cat > README.md << 'EOF'
# AI 智能简历优化应用

基于 AI 的智能简历优化系统，通过分析用户上传的简历和目标职位要求，自动生成针对性优化的简历版本。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design 5
- Zustand (状态管理)
- React Router v6

### 后端
- FastAPI
- PostgreSQL
- Redis
- Celery
- SQLAlchemy
- OpenAI API

## 快速开始

### 使用 Docker Compose（推荐）

1. 复制环境变量文件：
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. 编辑 `backend/.env`，填入必要的配置（特别是 OPENAI_API_KEY）

3. 启动所有服务：
```bash
docker-compose up -d
```

4. 访问应用：
- 前端：http://localhost:5173
- 后端 API：http://localhost:8000
- API 文档：http://localhost:8000/docs

### 本地开发

#### 后端

1. 创建虚拟环境并安装依赖：
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件
```

3. 启动数据库（PostgreSQL 和 Redis）

4. 运行数据库迁移：
```bash
alembic upgrade head
```

5. 启动后端服务：
```bash
uvicorn app.main:app --reload
```

#### 前端

1. 安装依赖：
```bash
cd frontend
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
```

3. 启动开发服务器：
```bash
npm run dev
```

## 项目结构

```
.
├── frontend/          # 前端项目
├── backend/           # 后端项目
├── docs/              # 文档
├── scripts/           # 脚本
├── docker-compose.yml # Docker Compose 配置
└── README.md
```

## 功能特性

- ✅ 简历上传和解析（支持 PDF、Word）
- ✅ AI 驱动的简历结构化提取
- ✅ 职位需求智能分析
- ✅ 简历与职位匹配度计算
- ✅ 智能简历优化建议
- ✅ 一键生成优化简历
- ✅ 多格式简历导出

## 开发计划

详见 [实施计划.md](./实施计划.md)

## 技术文档

- [需求文档](./需求文档.md)
- [技术架构文档](./技术架构文档.md)
- [实施计划](./实施计划.md)

## License

MIT
EOF

echo -e "${GREEN}✅ README 创建完成${NC}"

echo ""
echo -e "${GREEN}🎉 项目初始化完成！${NC}"
echo ""
echo -e "${BLUE}下一步操作：${NC}"
echo "1. 编辑 backend/.env 文件，配置必要的环境变量（特别是 OPENAI_API_KEY）"
echo "2. 运行 'docker-compose up -d' 启动所有服务"
echo "3. 访问 http://localhost:5173 查看前端应用"
echo "4. 访问 http://localhost:8000/docs 查看 API 文档"
echo ""
echo -e "${YELLOW}注意：首次运行需要等待 Docker 镜像构建，可能需要几分钟时间${NC}"
