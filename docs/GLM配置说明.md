# 使用 GLM (智谱 AI) 配置说明

本项目已配置为支持智谱 AI 的 GLM 模型。

## 获取 GLM API Key

1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
2. 注册并登录账号
3. 在控制台创建 API Key
4. 复制 API Key

## 配置步骤

编辑 `backend/.env` 文件，填入你的 GLM API Key：

```env
# AI 配置 (GLM/Zhipu AI)
OPENAI_API_KEY="your-glm-api-key-here"  # 替换为你的实际 API Key
OPENAI_API_BASE="https://open.bigmodel.cn/api/paas/v4/"
OPENAI_MODEL="glm-4"
```

## 可用模型

- `glm-4`: GLM-4 模型（推荐）
- `glm-4-plus`: GLM-4 Plus 模型（更强大）
- `glm-3-turbo`: GLM-3 Turbo 模型（更快速）

## 启动项目

配置完成后，运行：

```bash
docker-compose up -d
```

## 验证配置

访问 http://localhost:8000/docs 查看 API 文档，确认服务正常启动。
