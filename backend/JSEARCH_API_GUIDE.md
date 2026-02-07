# JSearch API 配置指南

## 1. 获取 JSearch API Key

### 步骤：

1. **注册 RapidAPI 账号**
   - 访问：https://rapidapi.com/
   - 点击 "Sign Up" 注册账号（免费）

2. **订阅 JSearch API**
   - 访问：https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
   - 点击 "Subscribe to Test" 按钮
   - 选择 **BASIC 免费套餐**（每月 200 次请求）
   - 无需信用卡

3. **获取 API Key**
   - 订阅后，在页面顶部可以看到 "X-RapidAPI-Key"
   - 复制这个 Key

4. **配置到项目中**
   ```bash
   # 在 backend 目录下创建或编辑 .env 文件
   cd backend
   echo "JSEARCH_API_KEY=你的API_KEY" >> .env
   ```

## 2. API 使用说明

### 免费套餐限制：
- 每月 200 次请求
- 每次请求最多返回 10 个职位
- 支持多页查询（最多 20 页）

### 支持的功能：
- ✅ 全球职位搜索（包括中国）
- ✅ 按关键词、地点筛选
- ✅ 按发布时间筛选（今天、3天、一周、一月）
- ✅ 远程职位筛选
- ✅ 雇佣类型筛选（全职、兼职、合同工、实习）
- ✅ 薪资信息
- ✅ 职位详情（描述、要求、技能等）

### 数据来源：
- Google for Jobs
- LinkedIn
- Indeed
- Glassdoor
- ZipRecruiter
- Monster
- 等 40+ 个招聘平台

## 3. 使用示例

### 搜索中国深圳的安全工程师职位：
```bash
curl -X POST "http://localhost:8000/api/v1/job-search/search" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Security Engineer",
    "location": "Shenzhen, China",
    "max_results": 20
  }'
```

### 搜索远程职位：
```bash
curl -X POST "http://localhost:8000/api/v1/job-search/search" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Python Developer",
    "location": "Remote",
    "max_results": 10
  }'
```

## 4. 降级策略

如果未配置 API Key 或 API 调用失败，系统会自动降级使用模拟数据，确保功能正常运行。

## 5. 监控 API 使用量

- 登录 RapidAPI Dashboard
- 查看 "Usage" 标签
- 监控每月请求次数

## 6. 升级到付费套餐（可选）

如果免费套餐不够用，可以升级：
- **PRO**: $9.99/月，1000 次请求
- **ULTRA**: $29.99/月，5000 次请求
- **MEGA**: $99.99/月，20000 次请求

## 7. 替代方案

如果不想使用 JSearch API，系统会自动使用模拟数据，或者可以：
- 自己爬取招聘网站（需遵守 robots.txt）
- 对接其他招聘平台 API（如拉勾、Boss直聘等）
