#!/bin/bash

echo "🔍 检查前端项目状态..."

cd "$(dirname "$0")/../frontend"

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules 不存在，正在安装依赖..."
    npm install
else
    echo "✅ 依赖已安装"
fi

# 检查关键文件
echo ""
echo "📁 检查关键文件..."
files=(
    "src/App.tsx"
    "src/main.tsx"
    "src/index.css"
    "src/pages/auth/Login.tsx"
    "src/pages/auth/Register.tsx"
    "src/pages/Dashboard.tsx"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file 不存在"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    echo ""
    echo "❌ 有文件缺失，请检查项目结构"
    exit 1
fi

echo ""
echo "✅ 所有文件检查通过"
echo ""
echo "🚀 启动前端开发服务器..."
echo "访问地址: http://localhost:5173"
echo ""

npm run dev
