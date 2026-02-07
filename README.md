# 🚀 AI 智能简历系统

一个基于 AI 的智能简历优化与职位匹配平台，帮助求职者快速生成高质量、针对性强的简历。

## ✨ 核心功能

### 📄 简历管理
- **智能解析**：支持上传 PDF、Word、Markdown 等多种格式简历
- **结构化存储**：自动提取个人信息、工作经历、项目经验、技能等关键信息
- **多版本管理**：支持同一简历的多个优化版本

### 💼 职位管理
- **职位录入**：支持手动输入或从招聘网站导入职位信息
- **智能解析**：自动提取职位要求、技能需求、薪资范围等关键信息
- **分类管理**：按行业、职能、公司等维度组织职位

### 🎯 智能匹配分析
- **多维度评分**：从技能匹配、经验匹配、教育背景等多个维度评估匹配度
- **优势识别**：自动识别简历中与职位高度匹配的亮点
- **差距分析**：指出简历与职位要求的差距，提供针对性改进建议
- **STAR 原则应用**：基于 Situation-Task-Action-Result 框架优化经历描述

### 🤖 AI 简历生成
- **深度内容优化**：运用 15 年猎头经验的 AI 模型进行内容重写
- **量化成果展示**：自动添加百分比、金额、规模等量化数据
- **关键词优化**：针对目标职位嵌入相关技术栈和行业术语
- **多模板支持**：提供现代简约、专业商务、创意设计等多种模板
- **多格式导出**：支持导出为 PDF、Word、HTML、Markdown、JSON

## 🏗️ 技术架构

### 后端技术栈
- **框架**：FastAPI (Python 3.10+)
- **数据库**：SQLite (可扩展至 PostgreSQL/MySQL)
- **ORM**：SQLAlchemy
- **AI 服务**：集成大语言模型 API
- **异步任务**：Celery + Redis
- **文档生成**：python-docx, xhtml2pdf

### 前端技术栈
- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **UI 组件**：Ant Design
- **状态管理**：React Hooks
- **HTTP 客户端**：Axios
- **路由**：React Router

## 📦 安装部署

### 环境要求
- Python 3.10+
- Node.js 16+
- Redis (用于 Celery 任务队列)

### 后端部署

```bash
# 进入后端目录
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库、AI API Key 等

# 初始化数据库
python init_db.py

# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 启动 Celery Worker (新终端)
celery -A app.celery_app worker --loglevel=info
```

### 前端部署

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 API 地址

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🎮 使用指南

### 1. 上传简历
- 点击"简历管理" → "上传简历"
- 选择本地简历文件（支持 PDF、Word、Markdown）
- 系统自动解析并结构化存储

### 2. 添加目标职位
- 点击"职位管理" → "添加职位"
- 输入职位信息或粘贴招聘链接
- 系统自动提取关键信息

### 3. 智能匹配分析
- 进入"智能匹配"页面
- 选择简历和目标职位
- 点击"开始分析"
- 查看匹配度评分、优势分析、改进建议

### 4. 生成优化简历
- 在匹配分析结果页面，点击"应用此改写"
- 选择简历模板和导出格式
- 点击"生成简历"
- 预览效果后导出

## 📁 项目结构

```
AI 智能简历/
├── backend/                 # 后端代码
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务逻辑
│   │   ├── db/             # 数据库配置
│   │   └── main.py         # 应用入口
│   ├── requirements.txt    # Python 依赖
│   └── .env.example        # 环境变量示例
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── components/     # 可复用组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 服务
│   │   └── App.tsx         # 应用入口
│   ├── package.json        # Node 依赖
│   └── .env.example        # 环境变量示例
├── .gitignore
└── README.md
```

## 🔧 配置说明

### 后端环境变量 (.env)
```env
# 数据库配置
DATABASE_URL=sqlite:///./resume_system.db

# AI 服务配置
AI_API_KEY=your_api_key_here
AI_API_BASE_URL=https://api.example.com

# Redis 配置 (Celery)
REDIS_URL=redis://localhost:6379/0

# 安全配置
SECRET_KEY=your_secret_key_here
```

### 前端环境变量 (.env)
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 🚀 核心特性

### AI 优化引擎
- **15年猎头经验模型**：基于资深猎头的简历优化经验训练
- **STAR 原则自动应用**：将平铺直叙的经历转化为结构化的成就描述
- **量化数据推断**：智能推断并补充缺失的量化指标
- **关键词密度优化**：提高 ATS (申请人跟踪系统) 通过率

### 匹配算法
- **技能匹配**：精准识别已掌握和缺失的技能
- **经验匹配**：评估工作年限、行业背景、职位级别的匹配度
- **教育背景**：分析学历、专业与职位要求的契合度
- **综合评分**：多维度加权计算总体匹配度

## 📊 系统优势

1. **智能化程度高**：深度集成 AI，不只是简单的关键词匹配
2. **用户体验优**：现代化 UI 设计，操作流程简洁直观
3. **可扩展性强**：模块化架构，易于添加新功能
4. **数据安全**：本地部署，数据完全可控

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 开源协议

MIT License

## 👨‍💻 作者

Robin Xie

## 📮 联系方式

如有问题或建议，欢迎通过 GitHub Issues 联系。

---

⭐ 如果这个项目对您有帮助，欢迎 Star！
