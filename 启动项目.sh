#!/bin/bash

echo "=========================================="
echo "  AI 智能简历优化应用 - 启动脚本"
echo "=========================================="
echo ""

# 进入项目目录
cd "$(dirname "$0")"

echo "📍 当前目录: $(pwd)"
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

echo "✅ Docker 正在运行"
echo ""

# 停止旧的容器
echo "🛑 停止旧容器..."
docker-compose down

echo ""
echo "🚀 启动服务（这可能需要几分钟）..."
echo ""

# 启动所有服务
docker-compose up -d --build

echo ""
echo "⏳ 等待服务启动..."
sleep 10

echo ""
echo "📊 服务状态:"
docker-compose ps

echo ""
echo "=========================================="
echo "  服务已启动！"
echo "=========================================="
echo ""
echo "📱 访问地址:"
echo "  - 前端页面: http://localhost:5173"
echo "  - 后端 API: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/docs"
echo ""
echo "📝 查看日志:"
echo "  docker-compose logs -f"
echo ""
echo "🛑 停止服务:"
echo "  docker-compose stop"
echo ""
